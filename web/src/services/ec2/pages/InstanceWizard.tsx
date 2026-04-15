/**
 * InstanceWizard — 4-step Cloudscape Wizard for launching a new EC2 instance.
 *
 * Step 1: Name and instance type
 * Step 2: Network settings (VPC, Subnet, Auto-assign public IP)
 * Step 3: Security (Security Groups multiselect, Key Pair)
 * Step 4: Review and launch
 *
 * Canonical hooks from Plans 04 and 05 populate all dropdowns from live API calls.
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Wizard from '@cloudscape-design/components/wizard'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Select from '@cloudscape-design/components/select'
import Multiselect from '@cloudscape-design/components/multiselect'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Box from '@cloudscape-design/components/box'
import type { SelectProps } from '@cloudscape-design/components/select'
import type { MultiselectProps } from '@cloudscape-design/components/multiselect'
import { useVpcs } from '../api/vpcs'
import { useSubnets } from '../api/subnets'
import { useSecurityGroups } from '../api/securityGroups'
import { useKeyPairs } from '../api/keyPairs'
import { useRunInstance } from '../api/instances'
import { useFlashNotifications, FlashNotifications } from '../components/FlashNotifications'
import { copy } from '../../../shared/copy'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INSTANCE_TYPES: SelectProps.Option[] = [
  { value: 't2.micro', label: 't2.micro' },
  { value: 't2.small', label: 't2.small' },
  { value: 't2.medium', label: 't2.medium' },
  { value: 't2.large', label: 't2.large' },
  { value: 't3.micro', label: 't3.micro' },
  { value: 't3.small', label: 't3.small' },
  { value: 't3.medium', label: 't3.medium' },
  { value: 't3.large', label: 't3.large' },
  { value: 'm5.large', label: 'm5.large' },
  { value: 'm5.xlarge', label: 'm5.xlarge' },
]

const PUBLIC_IP_OPTIONS: SelectProps.Option[] = [
  { value: 'enable', label: 'Enable' },
  { value: 'disable', label: 'Disable' },
]

const DEFAULT_AMI = 'ami-00000000000000001'

// ---------------------------------------------------------------------------
// Wizard state type
// ---------------------------------------------------------------------------

type WizardState = {
  nameTag: string
  instanceType: SelectProps.Option | null
  vpcId: SelectProps.Option | null
  subnetId: SelectProps.Option | null
  autoPublicIp: SelectProps.Option | null
  securityGroupIds: MultiselectProps.Option[]
  keyName: SelectProps.Option | null
}

const INITIAL_STATE: WizardState = {
  nameTag: '',
  instanceType: { value: 't2.micro', label: 't2.micro' },
  vpcId: null,
  subnetId: null,
  autoPublicIp: { value: 'enable', label: 'Enable' },
  securityGroupIds: [],
  keyName: null,
}

// ---------------------------------------------------------------------------
// Step 1: Name and instance type
// ---------------------------------------------------------------------------

type Step1Props = {
  state: WizardState
  onChange: (patch: Partial<WizardState>) => void
  errors: Record<string, string>
}

function Step1({ state, onChange, errors }: Step1Props) {
  return (
    <SpaceBetween size="l">
      <FormField
        label="Name"
        description="Optional. A Name tag will be applied to the instance."
        errorText={errors.nameTag}
      >
        <Input
          value={state.nameTag}
          onChange={({ detail }) => onChange({ nameTag: detail.value })}
          placeholder="e.g. my-web-server"
        />
      </FormField>
      <FormField
        label={
          <>
            Instance type <Box display="inline" color="text-status-error">*</Box>
          </>
        }
        description="Select the hardware configuration for your instance."
        errorText={errors.instanceType}
      >
        <Select
          selectedOption={state.instanceType}
          onChange={({ detail }) => onChange({ instanceType: detail.selectedOption })}
          options={INSTANCE_TYPES}
          placeholder="Select instance type"
        />
      </FormField>
    </SpaceBetween>
  )
}

// ---------------------------------------------------------------------------
// Step 2: Network settings
// ---------------------------------------------------------------------------

type Step2Props = {
  state: WizardState
  onChange: (patch: Partial<WizardState>) => void
  errors: Record<string, string>
}

function Step2({ state, onChange, errors }: Step2Props) {
  const { data: vpcs = [], isLoading: vpcsLoading } = useVpcs()
  const { data: subnets = [], isLoading: subnetsLoading } = useSubnets()

  const vpcOptions: SelectProps.Option[] = vpcs.map((vpc) => ({
    value: vpc.vpcId,
    label: `${vpc.vpcId} (${vpc.cidrBlock})${vpc.nameTag ? ` — ${vpc.nameTag}` : ''}`,
  }))

  const filteredSubnets = state.vpcId
    ? subnets.filter((s) => s.vpcId === state.vpcId?.value)
    : subnets

  const subnetOptions: SelectProps.Option[] = filteredSubnets.map((s) => ({
    value: s.subnetId,
    label: `${s.subnetId} (${s.cidrBlock})${s.nameTag ? ` — ${s.nameTag}` : ''}`,
  }))

  const handleVpcChange = useCallback(
    (option: SelectProps.Option | null) => {
      onChange({ vpcId: option, subnetId: null, securityGroupIds: [] })
    },
    [onChange],
  )

  return (
    <SpaceBetween size="l">
      <FormField
        label={
          <>
            VPC <Box display="inline" color="text-status-error">*</Box>
          </>
        }
        description="The virtual network for your instance."
        errorText={errors.vpcId}
      >
        <Select
          selectedOption={state.vpcId}
          onChange={({ detail }) => handleVpcChange(detail.selectedOption)}
          options={vpcOptions}
          placeholder="Select a VPC"
          statusType={vpcsLoading ? 'loading' : 'finished'}
          loadingText="Loading VPCs…"
          empty="No VPCs available"
        />
      </FormField>
      <FormField
        label={
          <>
            Subnet <Box display="inline" color="text-status-error">*</Box>
          </>
        }
        description="The subnet within the selected VPC."
        errorText={errors.subnetId}
      >
        <Select
          selectedOption={state.subnetId}
          onChange={({ detail }) => onChange({ subnetId: detail.selectedOption })}
          options={subnetOptions}
          placeholder="Select a subnet"
          statusType={subnetsLoading ? 'loading' : 'finished'}
          loadingText="Loading subnets…"
          empty={state.vpcId ? 'No subnets in this VPC' : 'Select a VPC first'}
          disabled={!state.vpcId}
        />
      </FormField>
      <FormField
        label="Auto-assign public IP"
        description="Automatically assign a public IP address to your instance."
      >
        <Select
          selectedOption={state.autoPublicIp}
          onChange={({ detail }) => onChange({ autoPublicIp: detail.selectedOption })}
          options={PUBLIC_IP_OPTIONS}
        />
      </FormField>
    </SpaceBetween>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Security
// ---------------------------------------------------------------------------

type Step3Props = {
  state: WizardState
  onChange: (patch: Partial<WizardState>) => void
  errors: Record<string, string>
}

function Step3({ state, onChange, errors }: Step3Props) {
  const { data: securityGroups = [], isLoading: sgLoading } = useSecurityGroups()
  const { data: keyPairs = [], isLoading: kpLoading } = useKeyPairs()

  const filteredSgs = state.vpcId
    ? securityGroups.filter((sg) => sg.vpcId === state.vpcId?.value)
    : securityGroups

  const sgOptions: MultiselectProps.Option[] = filteredSgs.map((sg) => ({
    value: sg.groupId,
    label: `${sg.groupName} (${sg.groupId})`,
    description: sg.groupDescription,
  }))

  const kpOptions: SelectProps.Option[] = [
    { value: '', label: 'Proceed without a key pair' },
    ...keyPairs.map((kp) => ({
      value: kp.keyName,
      label: kp.keyName,
    })),
  ]

  return (
    <SpaceBetween size="l">
      <FormField
        label={
          <>
            Security groups <Box display="inline" color="text-status-error">*</Box>
          </>
        }
        description="Select one or more security groups to control inbound and outbound traffic."
        errorText={errors.securityGroupIds}
      >
        <Multiselect
          selectedOptions={state.securityGroupIds}
          onChange={({ detail }) => onChange({ securityGroupIds: detail.selectedOptions as MultiselectProps.Option[] })}
          options={sgOptions}
          placeholder="Select security groups"
          statusType={sgLoading ? 'loading' : 'finished'}
          loadingText="Loading security groups…"
          empty={state.vpcId ? 'No security groups in this VPC' : 'Select a VPC in Step 2 first'}
        />
      </FormField>
      <FormField
        label="Key pair"
        description="Select an existing key pair to enable SSH access. You will need the private key file to connect."
        errorText={errors.keyName}
      >
        <Select
          selectedOption={state.keyName ?? { value: '', label: 'Proceed without a key pair' }}
          onChange={({ detail }) =>
            onChange({
              keyName: detail.selectedOption.value ? detail.selectedOption : null,
            })
          }
          options={kpOptions}
          statusType={kpLoading ? 'loading' : 'finished'}
          loadingText="Loading key pairs…"
        />
      </FormField>
    </SpaceBetween>
  )
}

// ---------------------------------------------------------------------------
// Step 4: Review and launch
// ---------------------------------------------------------------------------

type Step4Props = {
  state: WizardState
}

function Step4({ state }: Step4Props) {
  return (
    <SpaceBetween size="l">
      <ColumnLayout columns={2}>
        <KeyValuePairs
          columns={1}
          items={[
            { label: 'Name', value: state.nameTag || '—' },
            { label: 'Instance type', value: state.instanceType?.label ?? '—' },
          ]}
        />
        <KeyValuePairs
          columns={1}
          items={[
            { label: 'VPC', value: state.vpcId?.label ?? '—' },
            { label: 'Subnet', value: state.subnetId?.label ?? '—' },
            { label: 'Auto-assign public IP', value: state.autoPublicIp?.label ?? '—' },
          ]}
        />
      </ColumnLayout>
      <ColumnLayout columns={2}>
        <KeyValuePairs
          columns={1}
          items={[
            {
              label: 'Security groups',
              value:
                state.securityGroupIds.length > 0
                  ? state.securityGroupIds.map((sg) => sg.label).join(', ')
                  : '—',
            },
          ]}
        />
        <KeyValuePairs
          columns={1}
          items={[
            { label: 'Key pair', value: state.keyName?.label ?? 'None' },
          ]}
        />
      </ColumnLayout>
    </SpaceBetween>
  )
}

// ---------------------------------------------------------------------------
// Main wizard component
// ---------------------------------------------------------------------------

export default function InstanceWizard() {
  const navigate = useNavigate()
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [wizardState, setWizardState] = useState<WizardState>(INITIAL_STATE)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { items: flashItems, addSuccess, addError } = useFlashNotifications()
  const runInstance = useRunInstance()

  const patchState = useCallback((patch: Partial<WizardState>) => {
    setWizardState((prev) => ({ ...prev, ...patch }))
  }, [])

  const validateStep = useCallback(
    (stepIndex: number): boolean => {
      const newErrors: Record<string, string> = {}

      if (stepIndex === 0) {
        if (!wizardState.instanceType?.value) {
          newErrors.instanceType = 'Instance type is required.'
        }
      }

      if (stepIndex === 1) {
        if (!wizardState.vpcId?.value) {
          newErrors.vpcId = 'VPC is required.'
        }
        if (!wizardState.subnetId?.value) {
          newErrors.subnetId = 'Subnet is required.'
        }
      }

      if (stepIndex === 2) {
        if (wizardState.securityGroupIds.length === 0) {
          newErrors.securityGroupIds = 'At least one security group is required.'
        }
      }

      setErrors(newErrors)
      return Object.keys(newErrors).length === 0
    },
    [wizardState],
  )

  const handleNavigate = useCallback(
    ({ detail }: { detail: { requestedStepIndex: number; reason: string } }) => {
      if (detail.reason === 'next') {
        if (!validateStep(activeStepIndex)) return
      }
      setErrors({})
      setActiveStepIndex(detail.requestedStepIndex)
    },
    [activeStepIndex, validateStep],
  )

  const handleCancel = useCallback(() => {
    navigate('/services/ec2/instances')
  }, [navigate])

  const handleSubmit = useCallback(async () => {
    if (!validateStep(2)) {
      setActiveStepIndex(2)
      return
    }

    try {
      const xml = await runInstance.mutateAsync({
        imageId: DEFAULT_AMI,
        instanceType: wizardState.instanceType?.value ?? 't2.micro',
        subnetId: wizardState.subnetId?.value ?? '',
        securityGroupIds: wizardState.securityGroupIds.map((sg) => sg.value as string),
        keyName: wizardState.keyName?.value || undefined,
        nameTag: wizardState.nameTag || undefined,
      })

      // Extract instance ID from RunInstances response XML
      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, 'application/xml')
      const instanceId =
        doc.getElementsByTagName('instanceId')[0]?.textContent ?? 'unknown'

      addSuccess(copy.ec2ActionSuccess.launchInstance(instanceId))
      navigate('/services/ec2/instances')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to launch instance.'
      addError(message)
    }
  }, [wizardState, runInstance, addSuccess, addError, navigate, validateStep])

  return (
    <>
      <FlashNotifications items={flashItems} />
      <Wizard
        i18nStrings={{
          stepNumberLabel: (stepNumber) => `Step ${stepNumber}`,
          collapsedStepsLabel: (stepNumber, stepsCount) =>
            `Step ${stepNumber} of ${stepsCount}`,
          navigationAriaLabel: 'Steps',
          cancelButton: copy.ec2WizardCancel,
          previousButton: 'Previous',
          nextButton: 'Next',
          submitButton: copy.ec2WizardSubmit,
          optional: 'optional',
        }}
        onNavigate={handleNavigate}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        activeStepIndex={activeStepIndex}
        isLoadingNextStep={runInstance.isPending}
        steps={copy.ec2WizardSteps.map((step, idx) => ({
          title: step.title,
          description: step.description,
          content: (() => {
            switch (idx) {
              case 0:
                return <Step1 state={wizardState} onChange={patchState} errors={errors} />
              case 1:
                return <Step2 state={wizardState} onChange={patchState} errors={errors} />
              case 2:
                return <Step3 state={wizardState} onChange={patchState} errors={errors} />
              case 3:
                return <Step4 state={wizardState} />
              default:
                return null
            }
          })(),
        }))}
      />
    </>
  )
}
