import { collection, getDocs, writeBatch, doc, query, where } from 'firebase/firestore'
import { db } from '../firebase/firebase'
import type { EquipmentMaster } from './equipmentHelper'

/**
 * Migration utility to convert flat equipment structure to two-collection architecture
 * OLD STRUCTURE: equipment collection with serialCode per document
 * NEW STRUCTURE: equipmentMaster + assetInstances
 * 
 * ⚠️ WARNING: This is a one-time operation. Should be run in admin panel, not in production code.
 * Make a Firestore backup before running!
 */

interface OldEquipment {
  id: string
  name: string
  serialCode?: string
  category: 'asset' | 'consumable' | 'main'
  quantity?: number
  unit: string
  equipmentTypes?: string[]
  equipmentSubTypes?: string[]
  picture?: string
  available?: boolean
  condition?: string
  location?: string
}

interface MigrationResult {
  success: boolean
  migratedAssets: number
  skippedConsumables: number
  newMasterRecords: number
  newInstanceRecords: number
  errors: string[]
}

/**
 * Migrate equipment from flat structure to two-collection architecture
 * Groups all serial codes of same equipment into one master with multiple instances
 */
export async function migrateEquipmentToTwoCollection(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedAssets: 0,
    skippedConsumables: 0,
    newMasterRecords: 0,
    newInstanceRecords: 0,
    errors: []
  }

  try {
    console.log('Starting equipment migration...')

    // 1. Fetch all equipment from old structure
    const equipmentSnapshot = await getDocs(collection(db, 'equipment'))
    const allEquipment: OldEquipment[] = equipmentSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as OldEquipment))

    console.log(`Found ${allEquipment.length} equipment items to process`)

    // 2. Separate assets from consumables
    const assetsByName = new Map<string, OldEquipment[]>()
    const consumables: OldEquipment[] = []

    for (const item of allEquipment) {
      if (item.category === 'consumable' || item.category === 'main') {
        consumables.push(item)
        result.skippedConsumables++
      } else if (item.category === 'asset') {
        const key = item.name
        if (!assetsByName.has(key)) {
          assetsByName.set(key, [])
        }
        assetsByName.get(key)!.push(item)
      }
    }

    console.log(`Found ${assetsByName.size} unique assets to migrate`)
    console.log(`Skipping ${result.skippedConsumables} consumables (already in correct format)`)

    // 3. Create batch for writing new records
    const batch = writeBatch(db)
    let batchOperationCount = 0
    const maxBatchSize = 500 // Firestore batch limit

    // 4. Migrate each asset group
    for (const [equipmentName, items] of assetsByName.entries()) {
      try {
        // Get metadata from first item (assume all same equipment has same type)
        const firstItem = items[0]
        const name = equipmentName

        // Create master record
        const masterRef = doc(collection(db, 'equipmentMaster'))
        batch.set(masterRef, {
          id: masterRef.id,
          name: name,
          category: 'asset',
          unit: firstItem.unit || 'ชิ้น',
          equipmentTypes: firstItem.equipmentTypes || [],
          equipmentSubTypes: firstItem.equipmentSubTypes || [],
          picture: firstItem.picture || null,
          createdAt: new Date().toISOString(),
          migratedAt: new Date().toISOString(),
          migratedFromOldStructure: true
        } as EquipmentMaster)

        batchOperationCount++
        result.newMasterRecords++

        // Create instance records for each serial code
        for (const item of items) {
          const instanceRef = doc(collection(db, 'assetInstances'))
          batch.set(instanceRef, {
            equipmentId: masterRef.id,
            serialCode: item.serialCode || item.id,
            available: item.available !== false, // Default to true if not specified
            condition: item.condition || 'ปกติ',
            location: item.location || null,
            createdAt: new Date().toISOString(),
            migratedFromDocId: item.id // Track old document ID for reference
          })

          batchOperationCount++
          result.newInstanceRecords++
        }

        result.migratedAssets++

        // Commit batch if reaching size limit
        if (batchOperationCount >= maxBatchSize) {
          await batch.commit()
          console.log(`Committed batch of ${batchOperationCount} operations`)
          batchOperationCount = 0
        }
      } catch (error) {
        const errorMsg = `Error migrating asset "${equipmentName}": ${error instanceof Error ? error.message : String(error)}`
        console.error(errorMsg)
        result.errors.push(errorMsg)
      }
    }

    // 5. Commit remaining batch operations
    if (batchOperationCount > 0) {
      await batch.commit()
      console.log(`Committed final batch of ${batchOperationCount} operations`)
    }

    result.success = true
    console.log('✅ Migration completed successfully!')
    console.log(`Summary:
      - Assets migrated: ${result.migratedAssets}
      - Master records created: ${result.newMasterRecords}
      - Instance records created: ${result.newInstanceRecords}
      - Consumables skipped: ${result.skippedConsumables}
      - Errors: ${result.errors.length}`)

    return result
  } catch (error) {
    const errorMsg = `Fatal migration error: ${error instanceof Error ? error.message : String(error)}`
    console.error(errorMsg)
    result.errors.push(errorMsg)
    result.success = false
    return result
  }
}

/**
 * Rollback: Delete all migrated records (equipmentMaster and assetInstances)
 * ⚠️ DESTRUCTIVE: Only use to undo migration
 */
export async function rollbackMigration(): Promise<{
  success: boolean
  deletedMasters: number
  deletedInstances: number
  errors: string[]
}> {
  const result = {
    success: false,
    deletedMasters: 0,
    deletedInstances: 0,
    errors: [] as string[]
  }

  try {
    console.log('Starting migration rollback...')

    // Delete equipmentMaster records that were migrated
    const masterSnapshot = await getDocs(query(
      collection(db, 'equipmentMaster'),
      where('migratedFromOldStructure', '==', true)
    ))

    const batch = writeBatch(db)
    let batchCount = 0

    for (const doc of masterSnapshot.docs) {
      batch.delete(doc.ref)
      batchCount++
      result.deletedMasters++
    }

    // Delete assetInstances records that were migrated
    const instanceSnapshot = await getDocs(query(
      collection(db, 'assetInstances'),
      where('migratedFromDocId', '!=', null)
    ))

    for (const doc of instanceSnapshot.docs) {
      batch.delete(doc.ref)
      batchCount++
      result.deletedInstances++
    }

    if (batchCount > 0) {
      await batch.commit()
    }

    result.success = true
    console.log(`✅ Rollback complete! Deleted ${result.deletedMasters} masters and ${result.deletedInstances} instances`)
    return result
  } catch (error) {
    const errorMsg = `Rollback error: ${error instanceof Error ? error.message : String(error)}`
    console.error(errorMsg)
    result.errors.push(errorMsg)
    return result
  }
}

/**
 * Check migration status: count how many assets have been migrated
 */
export async function checkMigrationStatus(): Promise<{
  totalAssets: number
  migratedAssets: number
  nonMigratedAssets: number
  totalConsumables: number
  totalAssetInstances: number
}> {
  try {
    // Count old assets
    const equipmentSnapshot = await getDocs(query(
      collection(db, 'equipment'),
      where('category', '==', 'asset')
    ))

    const consumableSnapshot = await getDocs(query(
      collection(db, 'equipment'),
      where('category', '==', 'consumable')
    ))

    // Count new records
    const masterSnapshot = await getDocs(query(
      collection(db, 'equipmentMaster'),
      where('migratedFromOldStructure', '==', true)
    ))

    const instanceSnapshot = await getDocs(collection(db, 'assetInstances'))

    return {
      totalAssets: equipmentSnapshot.size,
      migratedAssets: masterSnapshot.size,
      nonMigratedAssets: equipmentSnapshot.size - masterSnapshot.size,
      totalConsumables: consumableSnapshot.size,
      totalAssetInstances: instanceSnapshot.size
    }
  } catch (error) {
    console.error('Error checking migration status:', error)
    return {
      totalAssets: 0,
      migratedAssets: 0,
      nonMigratedAssets: 0,
      totalConsumables: 0,
      totalAssetInstances: 0
    }
  }
}
