/** Browser-local records for synthetic mission exercises. No network transport. */
export interface WorkspaceImage { dataUrl: string; width: number; height: number; bytes: number }
export interface WorkspaceRecord {
  id: string;
  scenario: string;
  crew: string;
  day: number;
  note: string;
  completed: string[];
  image?: WorkspaceImage;
  savedAt: string;
  synthetic: true;
}

const DATABASE = "lightminute-workspace";
const TABLE = "daily-records";
export const workspaceRecordId = (scenario: string, crew: string, day: number) => JSON.stringify([scenario, crew, day]);

async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error("Local storage is unavailable in this browser.")); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore(TABLE, { keyPath: "id" }); };
    request.onerror = () => reject(new Error("Could not open the local mission journal."));
    request.onblocked = () => reject(new Error("Close older LIGHTMINUTE tabs and try again."));
    request.onsuccess = () => resolve(request.result);
  });
}

export async function readWorkspaceRecord(scenario: string, crew: string, day: number): Promise<WorkspaceRecord | undefined> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(TABLE, "readonly");
      const request = transaction.objectStore(TABLE).get(workspaceRecordId(scenario, crew, day));
      request.onsuccess = () => resolve(request.result as WorkspaceRecord | undefined);
      request.onerror = () => reject(new Error("Could not read the local check-in."));
    });
  } finally { database.close(); }
}

export async function saveWorkspaceRecord(record: WorkspaceRecord): Promise<void> {
  if (record.synthetic !== true || !Number.isInteger(record.day) || record.day < 1) throw new Error("Only labelled synthetic mission records can be saved.");
  if (record.note.length > 2000) throw new Error("Keep the note within 2,000 characters.");
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(TABLE, "readwrite");
      transaction.objectStore(TABLE).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error("Could not save the check-in. Local storage may be full."));
      transaction.onabort = () => reject(new Error("The check-in was not saved."));
    });
  } finally { database.close(); }
}

export async function prepareWorkspaceImage(file: File): Promise<WorkspaceImage> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPEG, PNG or WebP demonstration image.");
  if (file.size > 12 * 1024 * 1024) throw new Error("Choose an image smaller than 12 MB.");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("This browser could not decode the image."); }
  try {
    let scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 5; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing is unavailable on this device.");
      context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not prepare the image.")), "image/jpeg", .76));
      if (blob.size <= 350000) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not store the prepared image.")); reader.readAsDataURL(blob);
        });
        return { dataUrl, width: canvas.width, height: canvas.height, bytes: blob.size };
      }
      scale *= .7;
    }
    throw new Error("The image is still too large. Choose a smaller demonstration image.");
  } finally { bitmap.close(); }
}
