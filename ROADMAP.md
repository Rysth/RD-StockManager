# RD-StockManager — Roadmap

> **Estado:** en producción para el primer cliente (RysthDesign).
> **Siguiente objetivo:** cerrar 3 nuevos clientes antes de julio 2026.

---

## Situación actual (junio 2026)

### Negocio
| Métrica | Valor |
|---------|-------|
| Clientes activos | 3 (servicios varios) |
| MRR actual | $110/mes ($60 + $25 + $25) |
| Implementaciones cobradas | $600 c/u (validado — los clientes pagan) |
| Primer cliente StockManager | RysthDesign — en deploy activo |

### Código (rama `main`)
- [x] Módulo completo de inventario, ventas, compras, gastos, reportes
- [x] Facturación electrónica SRI
- [x] Cotizaciones con plantilla A4, conversión a venta
- [x] `Business.current` env-driven (sin hardcode por cliente)
- [x] Seeds de producción (admin-only, env-driven)
- [x] `docker-compose.prod.yml` autocontenido (Postgres + Redis incluidos)
- [x] Fix `FrontendUrls` en boot de producción
- [x] `DEPLOYMENT.md` actualizado con método real Dokploy

### Infraestructura
- [x] Rama `clients/rysthdesign` creada y desplegada en Dokploy
- [x] Dominio `stockmanager.rysthdesign.com` + `stockmanager-api.rysthdesign.com`
- [ ] Todos los contenedores corriendo estables (rdstock-api aún en revisión)

---

## FASE A — Estabilizar el primer deploy (esta semana)

**Objetivo:** que RysthDesign funcione 100% en producción. Es tu demo vivo.

- [ ] Confirmar que `rdstock-api` arranca sin reinicios
- [ ] Verificar login en `https://stockmanager.rysthdesign.com`
- [ ] Settings → Negocio: subir logo, confirmar datos, WhatsApp
- [ ] Settings → SRI: configurar RUC, razón social, certificado `.p12` (ambiente pruebas primero)
- [ ] Crear una cotización real → descargar PDF → verificar que se ve profesional
- [ ] Emitir una factura de prueba al SRI
- [ ] **Tomar captura de pantalla del panel funcionando** — la necesitas para vender

---

## FASE B — Definir y comunicar precios (esta semana)

**Objetivo:** tener una propuesta clara antes de hablar con cualquier cliente.

### Precios que debes usar

| | Precio | Por qué |
|---|---|---|
| **Implementación** | **$500 – $600** | Ya validado — tus clientes pagaron $600. No lo bajes. |
| **Mensual** | **$35 / mes** | $25 es demasiado bajo, apenas cubre infra. $35 es justo y competitivo. |
| **Anual** | **$350 / año** | 2 meses gratis. Mejor para ti: cobras todo junto y cubre el servidor. |
| **Promo junio** | **Implementación gratis** si contratan anual ($350) | Cierra más rápido, aseguras 12 meses. |

> **Regla de oro:** si el cliente contrata el plan anual ($350), la implementación
> es gratis. Cobras $350 de entrada y ya cubres el servidor ($200) + tu tiempo.
> Si quiere mensual, cobras $500-$600 de implementación porque asumes el riesgo
> de que cancele pronto.

### Qué decirle al cliente

> *"Es un sistema completo de inventario, ventas, cotizaciones y facturación SRI,
> desplegado en tu propio servidor — tus datos son tuyos. La implementación
> incluye la instalación, configuración con tus datos y capacitación.
> El mantenimiento mensual cubre actualizaciones, soporte y la infraestructura."*

---

## FASE C — Subir precios a clientes actuales (próximas 2 semanas)

**Objetivo:** llevar los $25/mes a $35/mes. Es un ajuste justo y necesario.

Tienes 3 clientes actuales. Los que pagan $25/mes están por debajo del costo real.

### Cómo comunicarlo

1. **Dar aviso con 30 días de anticipación** — es profesional y no genera rechazo.
2. **Justificarlo con valor nuevo:** si les ofreces StockManager como mejora,
   el aumento es mucho más fácil de aceptar.
3. **Mensaje sugerido por WhatsApp:**

> *"Hola [nombre], a partir del 1 de agosto voy a ajustar el plan mensual a $35.
> Llevo tiempo sin subir precios y necesito mantener la calidad del servicio.
> Además, en julio te voy a presentar una mejora importante en el sistema.
> Cualquier consulta me avisas."*

Si el cliente de $60/mes ya usa algo con más valor, mantén ese precio o súbelo
a $70 cuando le ofrezcas StockManager como upgrade.

### Impacto del ajuste

| Antes | Después |
|-------|---------|
| $110 / mes (3 clientes) | $130 / mes (si los 3 aceptan $35 + mantienes el de $60) |
| $1,320 / año | $1,560 / año |

No es dramático, pero es la base correcta para escalar.

---

## FASE D — Conseguir 3 nuevos clientes StockManager (junio–agosto)

**Objetivo:** llegar a 6 clientes totales en StockManager para llenar el primer servidor.

### Dónde buscar los primeros clientes

Los primeros 3 clientes de un producto nuevo casi siempre vienen de tu red cercana.
No necesitas publicidad todavía.

**Semana 1-2: lista de 20 contactos**
Escribe una lista de 20 negocios que conozcas (personalmente o por referidos) que:
- Tengan inventario físico (tiendas, distribuidoras, ferreterías, papelerías)
- O vendan servicios y necesiten cotizaciones + factura SRI
- Tengan 1-5 empleados
- Estén en Ecuador

**Semana 3-4: acercamiento directo**
No mandes un mensaje genérico. Escríbeles directamente:

> *"Hola [nombre], estoy lanzando un sistema de inventario y facturación SRI
> para negocios como el tuyo. Ya lo tengo funcionando con un cliente.
> ¿Tienes 20 minutos esta semana para que te lo muestre?"*

**El demo es tu arma principal:**
Muéstrales el panel funcionando en `stockmanager.rysthdesign.com` (o en un demo
que montes tú mismo). Ver el sistema real cierra más que cualquier presentación.

### Meta de conversión realista

De 20 contactos → 5-8 demos → 2-3 cierres. Eso es normal para un producto nuevo.

### Seguimiento numérico

| Mes | Meta clientes StockManager | MRR objetivo |
|-----|--------------------------|-------------|
| Junio | 1 (RysthDesign) | $110 actual + $350 anual cobrado |
| Julio | 3 | ~$180/mes recurrente |
| Agosto | 5 | ~$260/mes recurrente |
| Septiembre | 7-8 | ~$350/mes recurrente |

---

## FASE E — Operación estable (septiembre en adelante)

Una vez que tengas 6-8 clientes, el foco cambia a **no perderlos**.

### Soporte sin quemarte

- Horario fijo de soporte: L-V 7pm–9pm y sábados 10am–12pm
- Comunicar ese horario desde el contrato — los clientes lo respetan
- Canal único: WhatsApp Business (no mezcles con tu personal)
- Responder en máximo 24h hábiles para temas no urgentes

### Mantenimiento del producto

```bash
# Cuando hagas mejoras en main → llevar a cada cliente:
git checkout clients/<nombre>
git merge main
git push origin clients/<nombre>
# Dokploy redeploya automático si tiene Autodeploy ON
```

Cada cliente que tienes en Dokploy con Autodeploy ON recibe las mejoras
automáticamente con solo hacer push. Esa es la ventaja del modelo.

### Renovaciones anuales

- Ponerte una alerta 30 días antes del vencimiento de cada cliente anual
- Escribirles proactivamente: *"Tu plan vence el [fecha], ¿lo renovamos?"*
- Ofrecer pago por Transferencia o depósito — en Ecuador es lo más común

---

## Decisiones de diseño registradas

| Decisión | Razón |
|----------|-------|
| Branch-per-client | Un deploy Dokploy por cliente; `main` es el tronco compartido |
| `Business` singleton env-driven | Cada cliente configura su identidad sin tocar código |
| Postgres + Redis dentro del compose | Stack autocontenido, no depende de servicios externos |
| Cotizaciones con líneas libres | Clientes de servicios (sin inventario) pueden cotizar igual |
| PDF client-side (react-to-print) | Sin dependencia de servidor PDF; plantilla ya es branded |
| No multi-tenancy | Deploy independiente por cliente; más simple, sin riesgo de contaminación |
| Implementación gratis con plan anual | Reduce fricción de entrada y asegura 12 meses de ingreso |

---

## Números clave para tener siempre presentes

| Concepto | Valor |
|----------|-------|
| Costo servidor / año | $200 |
| Clientes por servidor | 4 |
| Costo infra por cliente (servidor lleno) | $55 / año |
| Break-even de un servidor | 1 cliente anual a $350 ya lo cubre |
| Precio implementación | $500 – $600 |
| Precio mensual | $35 / mes |
| Precio anual | $350 / año (2 meses gratis) |
| Meta MRR para igualar salario | ~30 clientes × $35 = $1,050 / mes |
