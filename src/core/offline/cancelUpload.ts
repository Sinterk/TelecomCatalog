import { deleteQueueItem } from './uploadQueue'
import { deletePhotoBlob } from './photoStore'

/**
 * Cancela y elimina completamente un upload de la cola y de IndexedDB.
 * Llamar esto antes de eliminar la foto del store Zustand.
 */
export async function cancelUpload(queueId: string): Promise<void> {
  await Promise.all([
    deleteQueueItem(queueId),
    deletePhotoBlob(queueId),
  ])
}
