# Task 05 — Driver Application Screens (React Native)

## Contexto
El proyecto está en React Native. Los servicios y repositorios
ya existen de los Tasks anteriores. Este task implementa las
pantallas del flujo de aprobación de conductor.

El flujo tiene 4 pasos:
1. Bottom sheet de trigger
2. Formulario de datos personales
3. Formulario de datos del vehículo
4. Subida de documentos
5. Pantalla de confirmación

El usuario actual se obtiene del contexto de autenticación existente.

## Objetivo
Implementar las pantallas del flujo completo de aprobación de conductor
en React Native, conectadas al servicio real.

## Archivos a crear

- `src/screens/driver-application/DriverApplicationBottomSheet.tsx`
- `src/screens/driver-application/PersonalInfoScreen.tsx`
- `src/screens/driver-application/VehicleInfoScreen.tsx`
- `src/screens/driver-application/DocumentUploadScreen.tsx`
- `src/screens/driver-application/ApplicationSuccessScreen.tsx`
- `src/screens/driver-application/ApplicationStatusBanner.tsx`
- `src/hooks/useDriverApplication.ts`

---

## Implementación

### `src/hooks/useDriverApplication.ts`

Hook que maneja el estado del formulario de múltiples pasos
y la subida de documentos.
```typescript
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth' // hook existente
import { driverApplicationService } from '../services/driver-application.service'

export interface DriverApplicationFormState {
  // Paso 1
  fullName: string
  cedula: string
  address: string
  whatsapp: string

  // Paso 2
  brand: string
  model: string
  year: string
  color: string
  plate: string
  availableSeats: string

  // Paso 3
  cedulaFront: { uri: string; mimeType: string } | null
  cedulaBack: { uri: string; mimeType: string } | null
  vehicleRegistration: { uri: string; mimeType: string } | null
  criminalRecord: { uri: string; mimeType: string } | null
}

export function useDriverApplication() {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<DriverApplicationFormState>({
    fullName: user?.name ?? '',
    cedula: '',
    address: '',
    whatsapp: user?.phoneNumber ?? '',
    brand: '',
    model: '',
    year: '',
    color: '',
    plate: '',
    availableSeats: '',
    cedulaFront: null,
    cedulaBack: null,
    vehicleRegistration: null,
    criminalRecord: null,
  })

  const updateForm = (fields: Partial<DriverApplicationFormState>) => {
    setForm(prev => ({ ...prev, ...fields }))
  }

  const nextStep = () => setStep(prev => prev + 1)
  const prevStep = () => setStep(prev => prev - 1)

  const submit = async () => {
    if (!user) return
    if (!form.cedulaFront || !form.cedulaBack || !form.vehicleRegistration) {
      setError('Debés subir todos los documentos obligatorios.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await driverApplicationService.submitApplication({
        userId: user.id,
        fullName: form.fullName,
        cedula: form.cedula,
        address: form.address,
        whatsapp: form.whatsapp,
        vehicle: {
          brand: form.brand,
          model: form.model,
          year: parseInt(form.year),
          color: form.color,
          plate: form.plate,
          availableSeats: parseInt(form.availableSeats),
        },
        documents: {
          cedulaFront: {
            file: await fetch(form.cedulaFront.uri).then(r => r.blob()),
            mimeType: form.cedulaFront.mimeType,
          },
          cedulaBack: {
            file: await fetch(form.cedulaBack.uri).then(r => r.blob()),
            mimeType: form.cedulaBack.mimeType,
          },
          vehicleRegistration: {
            file: await fetch(form.vehicleRegistration.uri).then(
              r => r.blob()
            ),
            mimeType: form.vehicleRegistration.mimeType,
          },
          ...(form.criminalRecord && {
            criminalRecord: {
              file: await fetch(form.criminalRecord.uri).then(r => r.blob()),
              mimeType: form.criminalRecord.mimeType,
            },
          }),
        },
      })
      nextStep() // Va a la pantalla de éxito
    } catch (e: any) {
      setError(e.message ?? 'Ocurrió un error. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return {
    step,
    form,
    loading,
    error,
    updateForm,
    nextStep,
    prevStep,
    submit,
  }
}
```

### `src/screens/driver-application/ApplicationStatusBanner.tsx`

Componente que se muestra en el home según el estado de la solicitud.
```typescript
import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { DriverApplicationStatus } from '../../models/driver-application.model'

interface Props {
  status: DriverApplicationStatus
  onEditPress?: () => void
  onRetryPress?: () => void
  onPublishPress?: () => void
}

const BANNER_CONFIG = {
  pending: {
    backgroundColor: '#1A2744',
    borderColor: '#3B5BDB',
    icon: '🕐',
    title: 'Solicitud en revisión',
    description: 'Te contactaremos por WhatsApp en menos de 24 horas.',
  },
  in_review: {
    backgroundColor: '#1A2744',
    borderColor: '#3B5BDB',
    icon: '🕐',
    title: 'Solicitud en revisión',
    description: 'Te contactaremos por WhatsApp en menos de 24 horas.',
  },
  changes_requested: {
    backgroundColor: '#2D1F00',
    borderColor: '#F59E0B',
    icon: '✏️',
    title: 'Se requieren cambios',
    description: 'Revisá la información de tu solicitud y corregila.',
    ctaLabel: 'Editar solicitud →',
  },
  approved: {
    backgroundColor: '#0D2818',
    borderColor: '#10B981',
    icon: '✅',
    title: '¡Sos conductor!',
    description: 'Ya podés publicar viajes desde el tab Ofrecer viaje.',
    ctaLabel: 'Publicar mi primer viaje →',
  },
  rejected: {
    backgroundColor: '#2D0D0D',
    borderColor: '#EF4444',
    icon: '❌',
    title: 'Solicitud rechazada',
    description:
      'Tu solicitud no fue aprobada. Podés corregir tu información e intentarlo de nuevo.',
    ctaLabel: 'Reintentar →',
  },
}

export function ApplicationStatusBanner({
  status,
  onEditPress,
  onRetryPress,
  onPublishPress,
}: Props) {
  const config = BANNER_CONFIG[status]
  if (!config) return null

  const handleCtaPress = () => {
    if (status === 'changes_requested') onEditPress?.()
    if (status === 'rejected') onRetryPress?.()
    if (status === 'approved') onPublishPress?.()
  }

  return (
    <View
      style={{
        backgroundColor: config.backgroundColor,
        borderLeftWidth: 3,
        borderLeftColor: config.borderColor,
        padding: 12,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Text style={{ fontSize: 20, marginRight: 10 }}>{config.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>
            {config.title}
          </Text>
          <Text style={{ color: '#A0A0A0', fontSize: 12, marginTop: 2 }}>
            {config.description}
          </Text>
        </View>
      </View>
      {'ctaLabel' in config && config.ctaLabel && (
        <TouchableOpacity onPress={handleCtaPress}>
          <Text
            style={{
              color: config.borderColor,
              fontSize: 12,
              fontWeight: 'bold',
              marginLeft: 8,
            }}
          >
            {config.ctaLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
```

### Pantallas restantes

Para las pantallas `PersonalInfoScreen`, `VehicleInfoScreen`,
`DocumentUploadScreen` y `ApplicationSuccessScreen`, seguir este patrón:

- Usar el hook `useDriverApplication` para manejar el estado
- Usar los componentes de formulario existentes en el proyecto
- Cada pantalla recibe `navigation` como prop y usa el hook compartido
- La subida de documentos usa `expo-image-picker` o la librería
  existente en el proyecto para acceder a cámara/galería
- Mostrar indicador de progreso de upload por documento
- El botón de submit está deshabilitado mientras `loading === true`

## Criterio de éxito
- El flujo de 4 pasos funciona end-to-end en el simulador
- Los documentos se suben correctamente a Firebase Storage
- La solicitud aparece en Firestore con todos los datos
- El banner de estado se muestra correctamente en el home
  según el estado de la solicitud del usuario
- No hay errores TypeScript