# Plan de Negocio — StockManager by RysthDesign

> Documento privado. Está en `.gitignore` — no se sube a GitHub.

---

## 1. Situación real (junio 2026)

| Variable | Valor |
|----------|-------|
| Salario trabajo principal | ~$1,000 / mes |
| Régimen tributario | RIMPE Negocios Populares |
| Clientes actuales (otro servicio) | 3 → $60 + $25 + $25 = **$110 / mes** |
| Clientes StockManager | 1 (RysthDesign, en deploy) |
| Modelo | Tú despliegas y mantienes, tiempo parcial |

**Ingreso total actual: $1,000 (empleo) + $110 (freelance) = $1,110 / mes**

---

## 2. Precios de StockManager por etapa

| Concepto | Precio | Notas |
|----------|--------|-------|
| **Implementación fundadores** | **$625** | Solo primeros 3 clientes StockManager. Precio de validación, no precio final. |
| **Mensual fundadores** | **$35 / mes** | Hasta 5 usuarios. Buen punto para Ecuador sin fricción alta. |
| **Anual fundadores** | **$350 / año** | 2 meses gratis vs mensual ($420/año). |
| **Implementación posterior** | **$700-$900** | Subir gradualmente cuando el software esté más probado. |
| **Mensual posterior** | **$35-$45 / mes** | No pasar de $45/mes salvo clientes con mayor operación o soporte. |
| **Ajuste anual** | **+5% anual** | Aplicable a mensualidad/mantenimiento desde el segundo año. |

### Política de precio fundador

Los primeros 3 clientes StockManager entran como **clientes fundadores**:

- Implementación: **$625**.
- Mensualidad: **$35/mes**.
- Entrega comercial: **2 semanas**.
- Forma de pago implementación: **50% anticipo + 50% contra entrega**.
- El precio fundador se mantiene para esos clientes mientras sigan activos.

Después de los 3 primeros clientes, la estrategia no debe ser subir agresivamente
la mensualidad. En Ecuador la mensualidad genera fricción rápido; es mejor subir
primero la implementación y mantener la mensualidad cerca de $35.

### Escalera de precios recomendada

| Etapa | Clientes | Implementación | Mensualidad | Objetivo |
|-------|----------|----------------|-------------|----------|
| Fundadores | 1-3 | $625 | $35/mes | Validar ventas, soporte y operación real. |
| Validado | 4-8 | $700-$750 | $35-$39/mes | Capturar más valor sin asustar al cliente. |
| Probado | 9+ | $800-$900 | $39-$45/mes | Mejor margen por implementación. |

**Regla:** el techo normal de mensualidad debe ser **$45/mes**. Si el cliente
necesita más usuarios, más soporte, sucursales o personalizaciones, se cobra por
paquetes adicionales, no subiendo el plan base para todos.

### Comparativa para el cliente

| | Año 1 | Año 2+ |
|---|-------|--------|
| Plan mensual fundador | $625 impl + $420 recurrente = **$1,045** | **$420 / año** |
| Plan anual fundador | $625 impl + $350 recurrente = **$975** | **$350 / año** |

> El plan anual ahorra $70 el primer año y $70 cada año siguiente.
> Para ti es mejor el anual: cobras $975 de entrada y tienes al cliente
> comprometido 12 meses desde el día 1.

### Plazo comercial de implementación

Aunque el software base ya exista, no conviene vender la entrega como "inmediata".
El plazo comercial correcto es **2 semanas**:

- Semana 1: configuración whitelabel, datos iniciales, usuarios, permisos,
  dominio/subdominio, despliegue y ajustes de operación.
- Semana 2: pruebas, correcciones, capacitación, validación con el cliente y
  puesta en producción.

Esto no debe comunicarse como "desarrollo desde cero". Debe comunicarse como
**implementación, configuración, pruebas y puesta en marcha**. El cliente paga por
el resultado funcionando, no por la cantidad exacta de horas internas.

### Forma de cobro recomendada

Para implementación de $625:

| Momento | Valor |
|---------|------:|
| 50% anticipo para iniciar | $312.50 |
| 50% contra entrega | $312.50 |
| **Total implementación** | **$625.00** |

La mensualidad de $35 empieza al entregar el sistema o al iniciar el primer mes
de operación, según lo que se acuerde en la cotización.

### ¿Dar implementación gratis si contratan anual?

No hace falta. A $625 de implementación ya validado, el cliente que quiere
el sistema lo paga. Reserva ese recurso ("implementación gratis") para
clientes que duden mucho o sean estratégicamente importantes.

---

## 3. Costos de infraestructura

| Concepto | Costo | Detalle |
|----------|-------|---------|
| Servidor Dokploy | $200 / año | 4 stacks por servidor |
| Dominio | $20 / año | Un dominio, subdominios por cliente |
| **Total por servidor** | **$220 / año** | **$18.33 / mes** |

### Costo real por cliente según ocupación del servidor

| Clientes en servidor | Costo infra / cliente / año | Costo infra / cliente / mes |
|---------------------|----------------------------|-----------------------------|
| 1 (inicio) | $220 | $18.33 |
| 2 | $110 | $9.17 |
| 3 | $73 | $6.11 |
| **4 (óptimo)** | **$55** | **$4.58** |

**Regla clave: llena cada servidor antes de abrir el siguiente.**

---

## 4. Margen real por cliente StockManager

### Año 1 (servidor lleno, 4 clientes)

| Concepto | Plan mensual | Plan anual |
|----------|-------------|------------|
| Implementación | +$625 | +$625 |
| Recurrente año 1 | +$420 | +$350 |
| **Ingreso total año 1** | **+$1,045** | **+$975** |
| Costo infra | -$55 | -$55 |
| Tu tiempo implementación comercial | incluido en implementación | incluido en implementación |
| Tu tiempo soporte (~1h/mes) | ~-$180 | ~-$180 |
| **Margen neto año 1** | **~$810** antes de valorar tiempo | **~$740** antes de valorar tiempo |

La implementación se vende como un proceso de 2 semanas, pero no significa 2
semanas de trabajo completo. El producto base ya existe. Tu trabajo real debe
concentrarse en configuración, whitelabel, despliegue, pruebas y capacitación.

Si el cliente consume 10-15 horas reales, $625 sigue siendo sano:

| Horas reales | Valor efectivo por hora |
|--------------|-------------------------:|
| 10h | $62.50/h |
| 15h | $41.67/h |
| 20h | $31.25/h |

La regla operativa es proteger tu tiempo: no vender personalizaciones grandes
dentro de la implementación base ni dentro de la mensualidad.

### Año 2+ (sin setup, solo soporte)

| Concepto | Plan mensual | Plan anual |
|----------|-------------|------------|
| Recurrente | +$420 | +$350 |
| Costo infra | -$55 | -$55 |
| Tu tiempo soporte | ~-$180 | ~-$180 |
| **Margen neto** | **~$185 / año** | **~$115 / año** |

> A $15/h tu tiempo (valor de oportunidad), cada cliente en año 2 te genera
> $185/año mensual o $115/año anual. **Pequeño por cliente, grande en volumen.**
> Con 30 clientes mensuales año 2: 30 × $185 = **$5,550 / año solo en recurrente**.

---

## 5. Proyección financiera a 5 años

### Supuestos

- Empiezas a cerrar clientes StockManager en julio 2026
- Ritmo conservador: **1 cliente nuevo / mes** (realista con trabajo a tiempo completo)
- Churn anual: 20%
- Mix: 70% plan mensual, 30% plan anual
- Los 3 clientes actuales ($110/mes) se mantienen separados y estables
- Primeros 3 clientes StockManager: $625 implementación + $35/mes
- Después de validación: implementación sube gradualmente a $700-$900
- MRR promedio por cliente: $35 base, con techo normal de $45/mes
- Ajuste anual de mensualidad: 5%
- Capacidad operativa: máximo 1 implementación activa a la vez

### Tabla año a año

| Año | Clientes SM nuevos | SM activos (fin) | Impl. cobradas | MRR SM (fin año) | MRR total (con $110) | Ingresos totales año | Infra | **Neto bruto** |
|-----|-------------------|-----------------|----------------|-----------------|---------------------|---------------------|-------|----------------|
| 2026 (6 meses) | 6 | 6 | ~$4,050 | ~$210-$234 | ~$320-$344 | ~$5,400 | $220 | **~$5,180** |
| 2027 | 12 | 16 | ~$9,000 | ~$560-$720 | ~$670-$830 | ~$18,000 | $440 | **~$17,560** |
| 2028 | 12 | 24 | ~$9,600 | ~$840-$1,080 | ~$950-$1,190 | ~$23,000 | $660 | **~$22,340** |
| 2029 | 12 | 30 | ~$10,200 | ~$1,050-$1,350 | ~$1,160-$1,460 | ~$27,000 | $880 | **~$26,120** |
| 2030 | 12 | 36 | ~$10,800 | ~$1,260-$1,620 | ~$1,370-$1,730 | ~$31,000 | $1,100 | **~$29,900** |

> Neto bruto = ingresos - infraestructura. No descuenta tu tiempo (ese es tu
> "sueldo" del producto).

### MRR acumulado mes a mes (primer año)

| Mes | SM clientes | SM MRR | Impl. del mes | Ingresos mes | + $110 base | **Total mes** |
|-----|------------|--------|--------------|-------------|-------------|--------------|
| Jul | 1 | $35 | $625 | $660 | $110 | **$770** |
| Ago | 2 | $70 | $625 | $695 | $110 | **$805** |
| Sep | 3 | $105 | $625 | $730 | $110 | **$840** |
| Oct | 4 | $140-$144 | $700 | ~$840 | $110 | **~$950** |
| Nov | 5 | $175-$183 | $700 | ~$875 | $110 | **~$985** |
| Dic | 6 | $210-$222 | $750 | ~$960 | $110 | **~$1,070** |

**Diciembre 2026: ~$1,070/mes de ingresos brutos** solo con 1 cliente nuevo/mes.

Con tu salario: **$1,000 + ~$1,070 = ~$2,070 / mes brutos** al cerrar el año.

---

## 6. Hitos de ingreso

| Hito | Clientes SM necesarios | Cuándo (estimado) |
|------|----------------------|-------------------|
| Primer servidor cubierto (infra) | 1 (impl $625 > servidor $220) | Mes 1 |
| $500/mes recurrentes estables | 10-12 SM activos + $110 base | 2027 |
| $1,000/mes recurrentes estables | 23-26 SM activos + $110 base | 2028 |
| Ingresos freelance = salario empleo | ~25 SM activos + implementaciones | 2028 |
| Posibilidad de reducir horas en empleo | 35+ SM activos | 2028-2029 |

La meta de **$500/mes estable** no debe medirse con implementaciones, porque la
implementación es ingreso activo y puntual. La ruta recomendada es:

```text
3 clientes actuales = $110/mes
3 clientes fundadores StockManager x $35 = $105/mes
7 clientes posteriores x $45 = $315/mes
Total recurrente = $530/mes
```

Si se mantiene todo en $35/mes, la ruta también funciona, pero requiere más
volumen:

```text
$110 base + 12 clientes StockManager x $35 = $530/mes
```

---

## 7. El rol de las implementaciones vs. recurrente

Este es el punto más importante del modelo:

```
Implementaciones = flujo de caja inmediato (pago por tu trabajo hoy)
Recurrente       = renta pasiva (pago por trabajo que ya hiciste)
```

**Con 1 cliente nuevo/mes:**
- Implementaciones: $625-$900/mes constantes (mientras sigas adquiriendo)
- Recurrente: crece mes a mes y no requiere trabajo nuevo

**En año 3, con 24 clientes activos:**
- Recurrente: 24 × $35-$45 = $840-$1,080/mes → llega mientras duermes
- Implementaciones: 1/mes × ~$800 = ~$800/mes → por trabajo real ese mes
- Total mensual del producto: ~$1,640-$1,880

El negocio es sano porque tienes **dos fuentes**: una activa (impl) y una pasiva (recurrente).

---

## 8. Capacidad operativa y whitelabel

Tu ventaja es que el software base ya está hecho y probado primero en tu propio
negocio. Eso te permite vender implementación, no desarrollo desde cero.

### Cómo comunicarlo al cliente

No decir: "me demoro 2 semanas programando el sistema".

Decir:

> La implementación toma hasta 2 semanas. La primera semana configuramos el
> sistema, usuarios, datos iniciales, marca y despliegue. La segunda semana se
> usa para pruebas, ajustes operativos, capacitación y salida a producción.

Esto es más defendible y profesional. El cliente no compra horas de código;
compra una solución funcionando y acompañada hasta producción.

### Alcance incluido en implementación base

La implementación base debe incluir:

- Configuración del sistema StockManager.
- Personalización whitelabel básica: nombre comercial, logo, colores y dominio/subdominio.
- Creación de usuarios iniciales.
- Configuración de permisos básicos.
- Carga inicial guiada de productos, categorías o datos base.
- Configuración de inventario, ventas/cotizaciones y reportes existentes.
- Despliegue en servidor administrado por RysthDesign.
- Pruebas funcionales antes de entrega.
- Capacitación inicial.
- Puesta en producción.

No debe incluir sin costo adicional:

- Nuevos módulos a medida.
- Cambios grandes de flujo de negocio.
- Integraciones externas.
- Migraciones complejas de datos.
- Soporte ilimitado.
- Más de una ronda grande de cambios posteriores a entrega.

### Capacidad con trabajo principal

| Variable | Regla |
|----------|-------|
| Trabajo principal | 9am-6pm |
| Horario real StockManager | Noches y fines de semana puntuales |
| Entrega comercial | 2 semanas |
| Implementaciones activas | Máximo 1 a la vez |
| Ritmo sano | 1 cliente nuevo por mes |
| Riesgo a controlar | Soporte y personalizaciones fuera de alcance |

La implementación de 2 semanas protege tu agenda. Aunque puedas hacerlo más
rápido, el plazo permite absorber trabajo nocturno, pruebas, feedback del cliente
y soporte inicial sin chocar con tu empleo principal.

---

## 9. Tributación RIMPE

| Ingresos brutos anuales | Régimen | Cuota aprox. |
|------------------------|---------|-------------|
| Hasta $20,000 | RIMPE Negocios Populares | $60 – $300 / año (cuota fija) |
| $20,001 – $300,000 | RIMPE Microempresas | 2% sobre ingresos brutos |

**Cuándo cruzas $20,000:**
- Con 1 cliente/mes: año 2027 puede quedar cerca del límite, según cuánto suba
  la implementación.
- Cruzas probablemente en 2028 → pagas 2% sobre ingresos brutos. Sigue siendo
  manejable frente al crecimiento del producto.

**Qué hacer ya:**
1. RUC activo como persona natural — actividad: desarrollo de software
2. Emitir facturas electrónicas a cada cliente desde el día 1 (puedes usar
   el propio StockManager para facturar tus servicios — es lo más elegante)
3. Registro simple de ingresos — RIMPE no exige contabilidad completa

---

## 10. Riesgos y respuestas

| Riesgo | Respuesta |
|--------|-----------|
| Cliente cancela en mes 3 | Cobras $625+ impl que ya tienes. Pierdes $35 × meses restantes. Por eso el anual es mejor. |
| No llegas a 1 cliente/mes | Con 1 cada 2 meses aún generas implementación + crecimiento lento. No te quiebra. |
| Cliente pide soporte intensivo | Horario fijo desde el contrato: L-V 7-9pm. No eres empleado, eres proveedor. |
| Cliente pide desarrollo a medida | Cotizar aparte. La mensualidad cubre mantenimiento, no desarrollo nuevo. |
| Bug crítico que afecta producción | Autodeploy en Dokploy + fix rápido en `main` + merge a cada rama. |
| Nuevo cliente en servidor lleno | Nuevo servidor $200. Se cubre con la impl del cliente que entra ($625+ > $220). |
| Tiempo de soporte desbordado | A 20+ clientes → cobrar plan de soporte premium $15-20/mes para los que más piden. |

---

## 11. Resumen ejecutivo

| | |
|---|---|
| **Precio implementación fundadores** | $625 solo primeros 3 clientes StockManager |
| **Precio implementación futuro** | $700-$900 según validación y demanda |
| **Precio mensual base** | $35 / mes (hasta 5 usuarios) |
| **Techo mensual normal** | $45 / mes |
| **Ajuste anual** | +5% anual sobre mensualidad/mantenimiento |
| **Precio anual** | $350 / año (2 meses gratis) |
| **Ingreso hoy** | $1,110/mes ($1,000 empleo + $110 clientes actuales) |
| **Meta $500 recurrentes** | $110 base + 10-12 clientes SM |
| **Meta fin 2026** | ~$2,000/mes brutos con 6 clientes SM + base actual |
| **Meta fin 2027** | ~$2,800-$3,200/mes brutos con 16 clientes SM |
| **Meta fin 2028** | ~$3,500+/mes brutos con 24 clientes SM → considerar reducir empleo |
| **Costo infra por cliente** | $55/año (servidor lleno) |
| **Break-even servidor** | 1 cliente SM cubre el servidor anual con solo la implementación |
| **Tributación** | RIMPE, <$400/año hasta superar $20,000 de ingresos |
| **Riesgo principal** | Tiempo de soporte a partir de 20+ clientes activos |

---

*Última actualización: Junio 2026*
