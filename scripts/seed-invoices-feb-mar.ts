import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';
import { eq } from 'drizzle-orm';

// Configuración de conexión
const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: true }
});
const db = drizzle(connection, { schema, mode: 'default' });

// Tipos de servicios para pianos
const serviceTypes = [
  { type: 'tuning', name: 'Afinación de piano', minPrice: 100, maxPrice: 150 },
  { type: 'repair', name: 'Reparación', minPrice: 150, maxPrice: 250 },
  { type: 'regulation', name: 'Regulación', minPrice: 180, maxPrice: 250 },
  { type: 'maintenance_basic', name: 'Mantenimiento básico', minPrice: 100, maxPrice: 180 },
  { type: 'maintenance_complete', name: 'Mantenimiento completo', minPrice: 200, maxPrice: 250 },
  { type: 'inspection', name: 'Inspección', minPrice: 100, maxPrice: 150 },
];

// Función para generar fecha aleatoria en un mes específico
function randomDateInMonth(year: number, month: number): Date {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.floor(Math.random() * daysInMonth) + 1;
  const hour = Math.floor(Math.random() * 24);
  const minute = Math.floor(Math.random() * 60);
  return new Date(year, month - 1, day, hour, minute);
}

// Función para generar precio aleatorio en un rango
function randomPrice(min: number, max: number): string {
  return (Math.random() * (max - min) + min).toFixed(2);
}

// Función para generar número de factura
function generateInvoiceNumber(year: number, month: number, index: number): string {
  const monthStr = month.toString().padStart(2, '0');
  const indexStr = (index + 1).toString().padStart(5, '0');
  return `${year}/${monthStr}${indexStr}`;
}

async function seedInvoices() {
  console.log('🚀 Iniciando población de facturas...');

  // 1. Obtener clientes reales de la base de datos
  console.log('📋 Obteniendo clientes...');
  const clients = await db.select().from(schema.clients).where(eq(schema.clients.partnerId, 1));
  
  if (clients.length === 0) {
    console.error('❌ No hay clientes en la base de datos');
    process.exit(1);
  }
  
  console.log(`✅ Encontrados ${clients.length} clientes`);

  // 2. Obtener pianos reales
  console.log('📋 Obteniendo pianos...');
  const pianos = await db.select().from(schema.pianos).where(eq(schema.pianos.partnerId, 1));
  
  if (pianos.length === 0) {
    console.error('❌ No hay pianos en la base de datos');
    process.exit(1);
  }
  
  console.log(`✅ Encontrados ${pianos.length} pianos`);

  // 3. Crear servicios y facturas para febrero 2026
  console.log('\n📅 Creando facturas para FEBRERO 2026...');
  const februaryInvoices = 42;
  let createdCount = 0;

  for (let i = 0; i < februaryInvoices; i++) {
    // Seleccionar cliente aleatorio
    const client = clients[Math.floor(Math.random() * clients.length)];
    
    // Seleccionar piano aleatorio (idealmente del mismo cliente, pero simplificamos)
    const piano = pianos[Math.floor(Math.random() * pianos.length)];
    
    // Seleccionar tipo de servicio aleatorio
    const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
    
    // Generar fecha aleatoria en febrero 2026
    const serviceDate = randomDateInMonth(2026, 2);
    
    // Generar precio
    const cost = randomPrice(serviceType.minPrice, serviceType.maxPrice);
    const taxRate = 0.21; // 21% IVA
    const subtotal = parseFloat(cost);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    try {
      // Crear servicio
      const [service] = await db.insert(schema.services).values({
        odId: `jnavarrete@inboundemotion.com`,
        pianoId: piano.id,
        clientId: client.id,
        serviceType: serviceType.type as any,
        date: serviceDate.toISOString().slice(0, 19).replace('T', ' '),
        cost: cost,
        duration: 120, // 2 horas
        notes: `${serviceType.name} realizado`,
        partnerId: 1,
        organizationId: 1,
      });

      // Crear factura asociada
      const invoiceNumber = generateInvoiceNumber(2026, 2, i);
      const dueDate = new Date(serviceDate);
      dueDate.setDate(dueDate.getDate() + 30); // 30 días para pagar

      await db.insert(schema.invoices).values({
        odId: `jnavarrete@inboundemotion.com`,
        invoiceNumber: invoiceNumber,
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email || '',
        clientAddress: client.address || '',
        date: serviceDate.toISOString().slice(0, 19).replace('T', ' '),
        dueDate: dueDate.toISOString().slice(0, 19).replace('T', ' '),
        status: 'sent', // 'sent' = pendiente de pago
        items: JSON.stringify([{
          description: serviceType.name,
          quantity: 1,
          unitPrice: subtotal,
          total: subtotal,
        }]),
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        notes: `Servicio realizado el ${serviceDate.toLocaleDateString('es-ES')}`,
        partnerId: 1,
        organizationId: 1,
      });

      createdCount++;
      if (createdCount % 10 === 0) {
        console.log(`  ✓ Creadas ${createdCount}/${februaryInvoices} facturas de febrero`);
      }
    } catch (error) {
      console.error(`❌ Error creando factura ${i + 1}:`, error);
    }
  }

  console.log(`✅ Completadas ${createdCount} facturas de FEBRERO 2026`);

  // 4. Crear servicios y facturas para marzo 2026
  console.log('\n📅 Creando facturas para MARZO 2026...');
  const marchInvoices = 48;
  createdCount = 0;

  for (let i = 0; i < marchInvoices; i++) {
    const client = clients[Math.floor(Math.random() * clients.length)];
    const piano = pianos[Math.floor(Math.random() * pianos.length)];
    const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
    const serviceDate = randomDateInMonth(2026, 3);
    
    const cost = randomPrice(serviceType.minPrice, serviceType.maxPrice);
    const taxRate = 0.21;
    const subtotal = parseFloat(cost);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    try {
      // Crear servicio
      await db.insert(schema.services).values({
        odId: `jnavarrete@inboundemotion.com`,
        pianoId: piano.id,
        clientId: client.id,
        serviceType: serviceType.type as any,
        date: serviceDate.toISOString().slice(0, 19).replace('T', ' '),
        cost: cost,
        duration: 120,
        notes: `${serviceType.name} realizado`,
        partnerId: 1,
        organizationId: 1,
      });

      // Crear factura
      const invoiceNumber = generateInvoiceNumber(2026, 3, i);
      const dueDate = new Date(serviceDate);
      dueDate.setDate(dueDate.getDate() + 30);

      await db.insert(schema.invoices).values({
        odId: `jnavarrete@inboundemotion.com`,
        invoiceNumber: invoiceNumber,
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email || '',
        clientAddress: client.address || '',
        date: serviceDate.toISOString().slice(0, 19).replace('T', ' '),
        dueDate: dueDate.toISOString().slice(0, 19).replace('T', ' '),
        status: 'sent',
        items: JSON.stringify([{
          description: serviceType.name,
          quantity: 1,
          unitPrice: subtotal,
          total: subtotal,
        }]),
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        notes: `Servicio realizado el ${serviceDate.toLocaleDateString('es-ES')}`,
        partnerId: 1,
        organizationId: 1,
      });

      createdCount++;
      if (createdCount % 10 === 0) {
        console.log(`  ✓ Creadas ${createdCount}/${marchInvoices} facturas de marzo`);
      }
    } catch (error) {
      console.error(`❌ Error creando factura ${i + 1}:`, error);
    }
  }

  console.log(`✅ Completadas ${createdCount} facturas de MARZO 2026`);

  console.log('\n🎉 Población completada exitosamente!');
  console.log(`📊 Total: ${februaryInvoices + marchInvoices} facturas creadas`);
  console.log(`   - Febrero 2026: ${februaryInvoices} facturas`);
  console.log(`   - Marzo 2026: ${marchInvoices} facturas`);
  console.log(`   - Estado: Todas pendientes (sent)`);
  console.log(`   - Montos: Entre €100 y €250 + IVA`);

  await connection.end();
}

// Ejecutar
seedInvoices().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
