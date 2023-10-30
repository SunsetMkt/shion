import type { VColorPicker, VTextField } from 'vuetify/components'
import type { AllowedComponentProps, VNodeProps } from 'vue'

import type { z as Zod, ZodObject } from 'zod'

type ComponentProps<C extends Component> = C extends new (...args: any) => any
  ? Omit<InstanceType<C>['$props'], keyof VNodeProps | keyof AllowedComponentProps>
  : never

interface FormItemProps {
  textField: ComponentProps<typeof VTextField>
  colorPicker: ComponentProps<typeof VColorPicker>
}

export interface FormItem<T extends keyof FormItemProps> {
  type: T
  key: string
  label: string
  value?: FormItemProps[T]['modelValue']
  props?: FormItemProps[T]
}

export type Form = Array<FormItem<keyof FormItemProps>>

export type BuildSchemaObject = (z: typeof Zod) => ZodObject<any, any, any, any, any>
