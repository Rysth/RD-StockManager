import { useCallback, useState } from "react";

export type FormErrors<T extends string = string> = Partial<Record<T, string>>;

/**
 * Manejo ligero de errores de validación por campo.
 *
 * Ejemplo:
 *   const { errors, validate, clearError } = useFormErrors<"name" | "email">();
 *   const ok = validate({
 *     name: !form.name.trim() ? "El nombre es requerido" : null,
 *     email: !isEmail(form.email) ? "Correo inválido" : null,
 *   });
 *   if (!ok) return; // los errores ya están pintados inline
 */
export function useFormErrors<T extends string = string>() {
  const [errors, setErrors] = useState<FormErrors<T>>({});

  const setError = useCallback((field: T, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const clearError = useCallback((field: T) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setErrors({}), []);

  /**
   * Recibe un mapa campo→mensaje|null. Los `null`/`undefined` se ignoran.
   * Devuelve `true` si no hubo errores. Hace focus al primer campo con error
   * si su elemento tiene `name`/`id` coincidente en el DOM.
   */
  const validate = useCallback((rules: Partial<Record<T, string | null | undefined>>) => {
    const next: FormErrors<T> = {};
    (Object.keys(rules) as T[]).forEach((field) => {
      const msg = rules[field];
      if (msg) next[field] = msg;
    });
    setErrors(next);
    const firstField = (Object.keys(next) as T[])[0];
    if (firstField) {
      const el =
        document.querySelector<HTMLElement>(`[name="${firstField}"]`) ??
        document.getElementById(firstField);
      el?.focus();
    }
    return Object.keys(next).length === 0;
  }, []);

  return { errors, setError, setErrors, clearError, clearAll, validate };
}
