# Task 02 — Firebase Storage para documentos KYC

## Contexto
El proyecto ya usa Firebase. Se necesita configurar Firebase Storage
para subir los documentos del flujo de aprobación de conductor.
Los documentos son privados — solo el propio usuario puede subirlos
y solo admins pueden leerlos.

## Objetivo
Crear el servicio de subida de documentos a Firebase Storage con
validación de tipo y tamaño, compresión de imágenes y manejo de errores.

## Archivos a crear

- `src/services/storage.service.ts`
- `src/services/document-upload.service.ts`

## Archivos a modificar

- `firebase.rules` (o donde estén las reglas de Storage) — agregar
  reglas para la carpeta driver-documents/

---

## Implementación

### Estructura de carpetas en Storage
```
driver-documents/
└── {userId}/
    └── {applicationId}/
        ├── cedula-front.jpg
        ├── cedula-back.jpg
        ├── vehicle-registration.jpg
        └── criminal-record.jpg
```

### `src/services/storage.service.ts`
```typescript
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

export type DocumentType =
  | 'cedula-front'
  | 'cedula-back'
  | 'vehicle-registration'
  | 'criminal-record'

export interface UploadResult {
  url: string
  path: string
}

export class StorageService {
  private storage = getStorage()

  async uploadDriverDocument(
    userId: string,
    applicationId: string,
    documentType: DocumentType,
    file: File | Blob,
    mimeType: string
  ): Promise<UploadResult> {
    // Validar tipo
    if (!ACCEPTED_TYPES.includes(mimeType)) {
      throw new Error(
        `Tipo de archivo no permitido. Usá JPG, PNG o PDF.`
      )
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `El archivo supera el límite de ${MAX_FILE_SIZE_MB}MB.`
      )
    }

    const extension = mimeType === 'application/pdf' ? 'pdf' : 'jpg'
    const path = `driver-documents/${userId}/${applicationId}/${documentType}.${extension}`
    const storageRef = ref(this.storage, path)

    await uploadBytes(storageRef, file, { contentType: mimeType })
    const url = await getDownloadURL(storageRef)

    return { url, path }
  }
}

export const storageService = new StorageService()
```

### `src/services/document-upload.service.ts`
```typescript
import { storageService, DocumentType, UploadResult } from './storage.service'

export interface DocumentUploadProgress {
  documentType: DocumentType
  status: 'idle' | 'uploading' | 'success' | 'error'
  url?: string
  error?: string
  progress?: number
}

export interface AllDocumentsUploadResult {
  cedulaFront: string
  cedulaBack: string
  vehicleRegistration: string
  criminalRecord?: string
}

export class DocumentUploadService {
  async uploadSingleDocument(
    userId: string,
    applicationId: string,
    documentType: DocumentType,
    file: File | Blob,
    mimeType: string
  ): Promise<UploadResult> {
    return storageService.uploadDriverDocument(
      userId,
      applicationId,
      documentType,
      file,
      mimeType
    )
  }

  async uploadAllDocuments(
    userId: string,
    applicationId: string,
    documents: {
      cedulaFront: { file: File | Blob; mimeType: string }
      cedulaBack: { file: File | Blob; mimeType: string }
      vehicleRegistration: { file: File | Blob; mimeType: string }
      criminalRecord?: { file: File | Blob; mimeType: string }
    }
  ): Promise<AllDocumentsUploadResult> {
    const [cedulaFront, cedulaBack, vehicleRegistration] = await Promise.all([
      this.uploadSingleDocument(
        userId, applicationId, 'cedula-front',
        documents.cedulaFront.file, documents.cedulaFront.mimeType
      ),
      this.uploadSingleDocument(
        userId, applicationId, 'cedula-back',
        documents.cedulaBack.file, documents.cedulaBack.mimeType
      ),
      this.uploadSingleDocument(
        userId, applicationId, 'vehicle-registration',
        documents.vehicleRegistration.file,
        documents.vehicleRegistration.mimeType
      ),
    ])

    let criminalRecord: string | undefined
    if (documents.criminalRecord) {
      const result = await this.uploadSingleDocument(
        userId, applicationId, 'criminal-record',
        documents.criminalRecord.file,
        documents.criminalRecord.mimeType
      )
      criminalRecord = result.url
    }

    return {
      cedulaFront: cedulaFront.url,
      cedulaBack: cedulaBack.url,
      vehicleRegistration: vehicleRegistration.url,
      criminalRecord,
    }
  }
}

export const documentUploadService = new DocumentUploadService()
```

### Reglas de Firebase Storage

Agregar al archivo de reglas existente:
```
match /driver-documents/{userId}/{applicationId}/{document} {
  // Solo el propio usuario puede subir sus documentos
  allow write: if request.auth != null
               && request.auth.uid == userId
               && request.resource.size < 5 * 1024 * 1024
               && request.resource.contentType.matches(
                    'image/jpeg|image/png|application/pdf'
                  );

  // Solo admins pueden leer (implementar según sistema de roles)
  allow read: if request.auth != null
              && request.auth.token.admin == true;
}
```

## Criterio de éxito
- El servicio sube archivos correctamente a la ruta definida
- Rechaza archivos mayores a 5MB con mensaje claro
- Rechaza tipos de archivo no permitidos
- Retorna la URL de descarga correctamente
- Los documentos no son accesibles públicamente