"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {
  animated?: boolean;
}

const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(
  ({ className, animated = true, ...props }, ref) => {
    const id = React.useId()

    return (
      <FormItemContext.Provider value={{ id }}>
        <div 
          ref={ref} 
          className={cn(
            "space-y-2 transition-all duration-200",
            animated && "animate-fade-in-up fill-both",
            className
          )} 
          {...props} 
        />
      </FormItemContext.Provider>
    )
  }
)
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
    required?: boolean;
    optional?: boolean;
  }
>(({ className, required, optional, children, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return (
    <Label
      ref={ref}
      className={cn(
        "flex items-center gap-1.5 text-sm font-medium transition-colors duration-200",
        error && "text-destructive",
        className
      )}
      htmlFor={formItemId}
      {...props}
    >
      {children}
      {required && (
        <span className="text-destructive text-xs" aria-hidden="true">*</span>
      )}
      {optional && (
        <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
      )}
    </Label>
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      data-error={!!error}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-xs text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    showIcon?: boolean;
  }
>(({ className, children, showIcon = true, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message) : children

  if (!body) {
    return null
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium text-destructive",
        "animate-fade-in-up",
        className
      )}
      {...props}
    >
      {showIcon && <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />}
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

const FormSuccess = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & {
    showIcon?: boolean;
  }
>(({ className, children, showIcon = true, ...props }, ref) => {
  if (!children) {
    return null
  }

  return (
    <p
      ref={ref}
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium text-success",
        "animate-fade-in-up",
        className
      )}
      {...props}
    >
      {showIcon && <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />}
      {children}
    </p>
  )
})
FormSuccess.displayName = "FormSuccess"

interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

const FormSection = React.forwardRef<HTMLDivElement, FormSectionProps>(
  ({ className, title, description, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-4", className)}
        {...props}
      >
        {(title || description) && (
          <div className="space-y-1">
            {title && (
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        <div className="space-y-4">
          {children}
        </div>
      </div>
    )
  }
)
FormSection.displayName = "FormSection"

interface FormRowProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3 | 4;
}

const FormRow = React.forwardRef<HTMLDivElement, FormRowProps>(
  ({ className, columns = 2, children, ...props }, ref) => {
    const gridCols = {
      1: "grid-cols-1",
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    }

    return (
      <div
        ref={ref}
        className={cn("grid gap-4", gridCols[columns], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
FormRow.displayName = "FormRow"

const FormActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    align?: "left" | "center" | "right" | "between";
  }
>(({ className, align = "right", children, ...props }, ref) => {
  const alignClasses = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
    between: "justify-between",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-wrap items-center gap-3 pt-4",
        alignClasses[align],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
FormActions.displayName = "FormActions"

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormSuccess,
  FormField,
  FormSection,
  FormRow,
  FormActions,
}
