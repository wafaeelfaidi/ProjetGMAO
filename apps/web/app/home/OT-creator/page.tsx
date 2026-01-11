'use client';

import React, { useState } from 'react';
import { FileText, Download, Sparkles, Loader, Calendar, DollarSign, Clock } from 'lucide-react';
import jsPDF from 'jspdf';

interface WorkOrderData {
  // Client Info
  clientCompany: string;
  clientAttn: string;
  clientAddress: string;
  clientCity: string;
  clientZip: string;
  clientPhone: string;
  clientEmail: string;

  // Schedule
  date: string;
  workOrderNo: string;
  startTime: string;
  endTime: string;

  // Payment
  downPayment: string;
  totalAmount: string;
  paymentDue: string;

  // Services
  services: Array<{
    description: string;
    hours: string;
    rate: string;
  }>;

  // Materials
  materials: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
  }>;

  // Additional
  discount: string;
  tax: string;
}

const COMPANY_INFO = {
  name: 'GMAO Solutions',
  attn: 'Service Department',
  address: '123 Industrial Avenue',
  city: 'Casablanca, Morocco',
  zip: '20000',
  phone: '+212 522 123 456',
  email: 'service@gmao.ma'
};

export default function OTCreatorPage() {
  const [workOrder, setWorkOrder] = useState<WorkOrderData>({
    clientCompany: '',
    clientAttn: '',
    clientAddress: '',
    clientCity: '',
    clientZip: '',
    clientPhone: '',
    clientEmail: '',
    date: new Date().toISOString().split('T')[0] || '',
    workOrderNo: `WO-${Date.now().toString().slice(-6)}`,
    startTime: '',
    endTime: '',
    downPayment: '',
    totalAmount: '',
    paymentDue: '',
    services: [{ description: '', hours: '', rate: '' }],
    materials: [{ description: '', quantity: '', unitPrice: '' }],
    discount: '0',
    tax: '20'
  });

  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addService = () => {
    setWorkOrder(prev => ({
      ...prev,
      services: [...prev.services, { description: '', hours: '', rate: '' }]
    }));
  };

  const addMaterial = () => {
    setWorkOrder(prev => ({
      ...prev,
      materials: [...prev.materials, { description: '', quantity: '', unitPrice: '' }]
    }));
  };

  const updateService = (index: number, field: keyof typeof workOrder.services[0], value: string) => {
    const newServices = [...workOrder.services];
    if (newServices[index]) {
      newServices[index][field] = value;
    }
    setWorkOrder(prev => ({ ...prev, services: newServices }));
  };

  const updateMaterial = (index: number, field: keyof typeof workOrder.materials[0], value: string) => {
    const newMaterials = [...workOrder.materials];
    if (newMaterials[index]) {
      newMaterials[index][field] = value;
    }
    setWorkOrder(prev => ({ ...prev, materials: newMaterials }));
  };

  const removeService = (index: number) => {
    if (workOrder.services.length > 1) {
      setWorkOrder(prev => ({
        ...prev,
        services: prev.services.filter((_, i) => i !== index)
      }));
    }
  };

  const removeMaterial = (index: number) => {
    if (workOrder.materials.length > 1) {
      setWorkOrder(prev => ({
        ...prev,
        materials: prev.materials.filter((_, i) => i !== index)
      }));
    }
  };

  const generateDescription = async (type: 'service' | 'material', index: number) => {
    setGeneratingDescription(true);
    setError(null);

    try {
      const contextItem = type === 'service' ? workOrder.services[index] : workOrder.materials[index];
      if (!contextItem) {
        throw new Error('Invalid item index');
      }

      const response = await fetch('/api/home/ot/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          context: contextItem.description
        })
      });

      if (!response.ok) throw new Error('Failed to generate description');

      const data = await response.json();
      
      if (type === 'service') {
        updateService(index, 'description', data.description);
      } else {
        updateMaterial(index, 'description', data.description);
      }
    } catch (err) {
      setError('Failed to generate description');
      console.error(err);
    } finally {
      setGeneratingDescription(false);
    }
  };

  const calculateTotals = () => {
    const servicesTotal = workOrder.services.reduce((sum, service) => {
      const hours = parseFloat(service.hours) || 0;
      const rate = parseFloat(service.rate) || 0;
      return sum + (hours * rate);
    }, 0);

    const materialsTotal = workOrder.materials.reduce((sum, material) => {
      const quantity = parseFloat(material.quantity) || 0;
      const price = parseFloat(material.unitPrice) || 0;
      return sum + (quantity * price);
    }, 0);

    const subtotal = servicesTotal + materialsTotal;
    const discount = parseFloat(workOrder.discount) || 0;
    const taxRate = parseFloat(workOrder.tax) || 0;
    
    const afterDiscount = subtotal - discount;
    const taxAmount = afterDiscount * (taxRate / 100);
    const total = afterDiscount + taxAmount;

    return { servicesTotal, materialsTotal, subtotal, discount, taxAmount, total };
  };

  const exportToPDF = () => {
    const pdf = new jsPDF();
    const totals = calculateTotals();
    
    // Title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PREVENTATIVE MAINTENANCE', 105, 20, { align: 'center' });
    pdf.text('WORK ORDER', 105, 28, { align: 'center' });
    
    // Contractor Info
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(240, 240, 240);
    pdf.rect(15, 35, 85, 8, 'F');
    pdf.text('CONTRACTOR', 17, 40);
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(`COMPANY: ${COMPANY_INFO.name}`, 17, 48);
    pdf.text(`ATTN: ${COMPANY_INFO.attn}`, 17, 53);
    pdf.text(`ADDRESS: ${COMPANY_INFO.address}`, 17, 58);
    pdf.text(`CITY, STATE: ${COMPANY_INFO.city}`, 17, 63);
    pdf.text(`ZIP: ${COMPANY_INFO.zip}`, 17, 68);
    pdf.text(`PHONE: ${COMPANY_INFO.phone}`, 17, 73);
    pdf.text(`E-MAIL: ${COMPANY_INFO.email}`, 17, 78);
    
    // Client Info
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(240, 240, 240);
    pdf.rect(110, 35, 85, 8, 'F');
    pdf.text('CLIENT', 112, 40);
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(`COMPANY: ${workOrder.clientCompany}`, 112, 48);
    pdf.text(`ATTN: ${workOrder.clientAttn}`, 112, 53);
    pdf.text(`ADDRESS: ${workOrder.clientAddress}`, 112, 58);
    pdf.text(`CITY, STATE: ${workOrder.clientCity}`, 112, 63);
    pdf.text(`ZIP: ${workOrder.clientZip}`, 112, 68);
    pdf.text(`PHONE: ${workOrder.clientPhone}`, 112, 73);
    pdf.text(`E-MAIL: ${workOrder.clientEmail}`, 112, 78);
    
    // Payment & Schedule
    let yPos = 88;
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(240, 240, 240);
    pdf.rect(15, yPos, 85, 8, 'F');
    pdf.text('PAYMENT', 17, yPos + 5);
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Down Payment: $${workOrder.downPayment}`, 17, yPos + 13);
    pdf.text(`Payment is Due: ${workOrder.paymentDue}`, 17, yPos + 18);
    pdf.text(`Total Amount: $${totals.total.toFixed(2)}`, 17, yPos + 23);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(240, 240, 240);
    pdf.rect(110, yPos, 85, 8, 'F');
    pdf.text('SCHEDULE', 112, yPos + 5);
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Date: ${workOrder.date}`, 112, yPos + 13);
    pdf.text(`Work Order No.: ${workOrder.workOrderNo}`, 112, yPos + 18);
    pdf.text(`Start Time: ${workOrder.startTime}`, 112, yPos + 23);
    pdf.text(`End Time: ${workOrder.endTime}`, 112, yPos + 28);
    
    // Services Table
    yPos = 125;
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(240, 240, 240);
    pdf.rect(15, yPos, 120, 8, 'F');
    pdf.rect(135, yPos, 20, 8, 'F');
    pdf.rect(155, yPos, 20, 8, 'F');
    pdf.rect(175, yPos, 20, 8, 'F');
    pdf.text('SERVICE', 17, yPos + 5);
    pdf.text('HOURS', 137, yPos + 5);
    pdf.text('RATE', 157, yPos + 5);
    pdf.text('AMOUNT', 177, yPos + 5);
    
    yPos += 8;
    pdf.setFont('helvetica', 'normal');
    workOrder.services.forEach(service => {
      const amount = (parseFloat(service.hours) || 0) * (parseFloat(service.rate) || 0);
      pdf.text(service.description.substring(0, 50), 17, yPos + 5);
      pdf.text(service.hours, 137, yPos + 5);
      pdf.text(`$${service.rate}`, 157, yPos + 5);
      pdf.text(`$${amount.toFixed(2)}`, 177, yPos + 5);
      yPos += 8;
    });
    
    pdf.rect(155, yPos, 20, 8);
    pdf.rect(175, yPos, 20, 8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL', 157, yPos + 5);
    pdf.text(`$${totals.servicesTotal.toFixed(2)}`, 177, yPos + 5);
    
    // Materials Table
    yPos += 15;
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(240, 240, 240);
    pdf.rect(15, yPos, 120, 8, 'F');
    pdf.rect(135, yPos, 20, 8, 'F');
    pdf.rect(155, yPos, 20, 8, 'F');
    pdf.rect(175, yPos, 20, 8, 'F');
    pdf.text('PRODUCTS / MATERIALS', 17, yPos + 5);
    pdf.text('QTY', 137, yPos + 5);
    pdf.text('PRICE', 157, yPos + 5);
    pdf.text('AMOUNT', 177, yPos + 5);
    
    yPos += 8;
    pdf.setFont('helvetica', 'normal');
    workOrder.materials.forEach(material => {
      const amount = (parseFloat(material.quantity) || 0) * (parseFloat(material.unitPrice) || 0);
      pdf.text(material.description.substring(0, 50), 17, yPos + 5);
      pdf.text(material.quantity, 137, yPos + 5);
      pdf.text(`$${material.unitPrice}`, 157, yPos + 5);
      pdf.text(`$${amount.toFixed(2)}`, 177, yPos + 5);
      yPos += 8;
    });
    
    pdf.rect(155, yPos, 20, 8);
    pdf.rect(175, yPos, 20, 8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL', 157, yPos + 5);
    pdf.text(`$${totals.materialsTotal.toFixed(2)}`, 177, yPos + 5);
    
    // Totals
    yPos += 15;
    pdf.rect(155, yPos, 20, 8);
    pdf.rect(175, yPos, 20, 8);
    pdf.text('SUBTOTAL', 157, yPos + 5);
    pdf.text(`$${totals.subtotal.toFixed(2)}`, 177, yPos + 5);
    
    yPos += 8;
    pdf.rect(155, yPos, 20, 8);
    pdf.rect(175, yPos, 20, 8);
    pdf.text('DISCOUNT', 157, yPos + 5);
    pdf.text(`$${totals.discount.toFixed(2)}`, 177, yPos + 5);
    
    yPos += 8;
    pdf.rect(155, yPos, 20, 8);
    pdf.rect(175, yPos, 20, 8);
    pdf.text('TAX / VAT', 157, yPos + 5);
    pdf.text(`$${totals.taxAmount.toFixed(2)}`, 177, yPos + 5);
    
    yPos += 8;
    pdf.setFillColor(240, 240, 240);
    pdf.rect(155, yPos, 20, 8, 'F');
    pdf.rect(175, yPos, 20, 8, 'F');
    pdf.text('TOTAL', 157, yPos + 5);
    pdf.text(`$${totals.total.toFixed(2)}`, 177, yPos + 5);
    
    pdf.save(`Work_Order_${workOrder.workOrderNo}.pdf`);
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-full mb-4 shadow-lg shadow-gray-500/50">
            <FileText className="w-5 h-5" />
            <span className="text-sm font-semibold">Work Order Creator</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 bg-clip-text text-transparent mb-3">
            Preventative Maintenance Work Order
          </h1>
          <p className="text-lg text-gray-600">
            Create professional work orders with AI-powered descriptions
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white backdrop-blur-sm rounded-2xl shadow-xl border border-gray-300 p-8 mb-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Contractor Info (Fixed) */}
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-4 pb-2 border-b-2 border-gray-400">
                CONTRACTOR (Company Info)
              </h3>
              <div className="space-y-2 text-sm bg-gray-50 border border-gray-300 p-4 rounded-lg text-gray-800">
                <p><span className="font-semibold">Company:</span> {COMPANY_INFO.name}</p>
                <p><span className="font-semibold">Attn:</span> {COMPANY_INFO.attn}</p>
                <p><span className="font-semibold">Address:</span> {COMPANY_INFO.address}</p>
                <p><span className="font-semibold">City:</span> {COMPANY_INFO.city}</p>
                <p><span className="font-semibold">ZIP:</span> {COMPANY_INFO.zip}</p>
                <p><span className="font-semibold">Phone:</span> {COMPANY_INFO.phone}</p>
                <p><span className="font-semibold">Email:</span> {COMPANY_INFO.email}</p>
              </div>
            </div>

            {/* Client Info */}
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-4 pb-2 border-b-2 border-gray-400">
                CLIENT
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Company Name"
                  value={workOrder.clientCompany}
                  onChange={(e) => setWorkOrder({ ...workOrder, clientCompany: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
                <input
                  type="text"
                  placeholder="Attention To"
                  value={workOrder.clientAttn}
                  onChange={(e) => setWorkOrder({ ...workOrder, clientAttn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={workOrder.clientAddress}
                  onChange={(e) => setWorkOrder({ ...workOrder, clientAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
                <input
                  type="text"
                  placeholder="City, State"
                  value={workOrder.clientCity}
                  onChange={(e) => setWorkOrder({ ...workOrder, clientCity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="ZIP"
                    value={workOrder.clientZip}
                    onChange={(e) => setWorkOrder({ ...workOrder, clientZip: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={workOrder.clientPhone}
                    onChange={(e) => setWorkOrder({ ...workOrder, clientPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  value={workOrder.clientEmail}
                  onChange={(e) => setWorkOrder({ ...workOrder, clientEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Schedule & Payment */}
          <div className="grid md:grid-cols-2 gap-8 mt-8">
            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-4 pb-2 border-b-2 border-gray-400">
                <Calendar className="w-5 h-5" />
                SCHEDULE
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={workOrder.date}
                    onChange={(e) => setWorkOrder({ ...workOrder, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Order No.</label>
                  <input
                    type="text"
                    value={workOrder.workOrderNo}
                    onChange={(e) => setWorkOrder({ ...workOrder, workOrderNo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={workOrder.startTime}
                      onChange={(e) => setWorkOrder({ ...workOrder, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={workOrder.endTime}
                      onChange={(e) => setWorkOrder({ ...workOrder, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-700 mb-4 pb-2 border-b-2 border-gray-400 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                PAYMENT
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Down Payment</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={workOrder.downPayment}
                    onChange={(e) => setWorkOrder({ ...workOrder, downPayment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment is Due</label>
                  <input
                    type="date"
                    value={workOrder.paymentDue}
                    onChange={(e) => setWorkOrder({ ...workOrder, paymentDue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-600">${totals.total.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-700 mb-4 pb-2 border-b-2 border-gray-400">
              SERVICES
            </h3>
            {workOrder.services.map((service, index) => (
              <div key={index} className="mb-4 p-4 bg-gray-50 border border-gray-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Service description (e.g., 'hydraulic pump repair')"
                        value={service.description}
                        onChange={(e) => updateService(index, 'description', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                      />
                      <button
                        onClick={() => generateDescription('service', index)}
                        disabled={generatingDescription || !service.description}
                        className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                      >
                        {generatingDescription ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="number"
                        placeholder="Hours"
                        value={service.hours}
                        onChange={(e) => updateService(index, 'hours', e.target.value)}
                        className="px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                      />
                      <input
                        type="number"
                        placeholder="Rate ($/hr)"
                        value={service.rate}
                        onChange={(e) => updateService(index, 'rate', e.target.value)}
                        className="px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                      />
                      <div className="flex items-center">
                        <span className="text-lg font-bold text-gray-700">
                          ${((parseFloat(service.hours) || 0) * (parseFloat(service.rate) || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeService(index)}
                    className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={addService}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-gray-600"
            >
              + Add Service
            </button>
            <div className="mt-3 text-right">
              <span className="text-lg font-bold text-gray-700">Services Total: ${totals.servicesTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Materials */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-700 mb-4 pb-2 border-b-2 border-gray-400">
              PRODUCTS / MATERIALS
            </h3>
            {workOrder.materials.map((material, index) => (
              <div key={index} className="mb-4 p-4 bg-gray-50 border border-gray-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Material description (e.g., 'hydraulic oil filter')"
                        value={material.description}
                        onChange={(e) => updateMaterial(index, 'description', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                      />
                      <button
                        onClick={() => generateDescription('material', index)}
                        disabled={generatingDescription || !material.description}
                        className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                      >
                        {generatingDescription ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="number"
                        placeholder="Quantity"
                        value={material.quantity}
                        onChange={(e) => updateMaterial(index, 'quantity', e.target.value)}
                        className="px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                      />
                      <input
                        type="number"
                        placeholder="Unit Price ($)"
                        value={material.unitPrice}
                        onChange={(e) => updateMaterial(index, 'unitPrice', e.target.value)}
                        className="px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                      />
                      <div className="flex items-center">
                        <span className="text-lg font-bold text-gray-700">
                          ${((parseFloat(material.quantity) || 0) * (parseFloat(material.unitPrice) || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMaterial(index)}
                    className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={addMaterial}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-gray-600"
            >
              + Add Material
            </button>
            <div className="mt-3 text-right">
              <span className="text-lg font-bold text-gray-700">Materials Total: ${totals.materialsTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Totals */}
          <div className="mt-8 border-t pt-6">
            <div className="max-w-md ml-auto space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Subtotal:</span>
                <span className="text-lg font-semibold">${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-700">Discount:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={workOrder.discount}
                    onChange={(e) => setWorkOrder({ ...workOrder, discount: e.target.value })}
                    className="w-32 px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                  <span className="text-lg font-semibold">$</span>
                </div>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-700">Tax / VAT:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={workOrder.tax}
                    onChange={(e) => setWorkOrder({ ...workOrder, tax: e.target.value })}
                    className="w-32 px-3 py-2 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  />
                  <span className="text-lg font-semibold">%</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2 border-gray-400">
                <span className="text-xl font-bold text-gray-900">TOTAL:</span>
                <span className="text-2xl font-bold text-gray-600">${totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={exportToPDF}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 font-bold text-lg"
            >
              <Download className="w-6 h-6" />
              Export Work Order as PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

