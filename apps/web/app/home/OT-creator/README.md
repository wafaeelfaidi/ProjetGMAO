# Work Order (OT) Creator

## Overview
The Work Order Creator is an AI-powered tool for generating professional preventative maintenance work orders with PDF export capabilities.

## Features

### 1. **Company Information (Fixed)**
The contractor information is pre-filled with your company details:
- Company Name: GMAO Solutions
- Address: 123 Industrial Avenue, Casablanca, Morocco
- Phone: +212 522 123 456
- Email: service@gmao.ma

### 2. **Client Information**
Fill in complete client details:
- Company name
- Contact person (Attention)
- Full address
- Phone and email

### 3. **Schedule Management**
- Date selection
- Automatic work order number generation
- Start and end time tracking

### 4. **Payment Tracking**
- Down payment amount
- Payment due date
- Automatic total calculation with tax

### 5. **Services Section**
Add multiple services with:
- **AI-Powered Descriptions**: Click the sparkle button to generate detailed, professional service descriptions
- Hours required
- Hourly rate
- Automatic amount calculation

**AI Description Examples:**
- "hydraulic pump repair" → Generates complete pump inspection and repair service description
- "motor maintenance" → Generates comprehensive electric motor maintenance details

### 6. **Materials Section**
Add multiple materials/products with:
- **AI-Powered Descriptions**: Generate detailed product specifications
- Quantity
- Unit price
- Automatic amount calculation

**AI Description Examples:**
- "hydraulic oil filter" → Generates complete filter specifications
- "bearing" → Generates precision bearing details with technical specs

### 7. **Automatic Calculations**
- Services total
- Materials total
- Subtotal
- Discount (adjustable)
- Tax/VAT (adjustable %)
- Final total

### 8. **PDF Export**
Generate professional PDF work orders with:
- Professional layout matching industry standards
- All information formatted correctly
- Ready to print or email to clients

## How to Use

1. **Navigate to Work Orders** from the sidebar menu

2. **Fill in Client Information**:
   - Enter client company name and contact details
   - Company info is already filled for you

3. **Set Schedule**:
   - Select work date
   - Set start and end times
   - Work order number is auto-generated (can be edited)

4. **Add Services**:
   - Click "Add Service"
   - Type a brief description (e.g., "hydraulic pump repair")
   - Click the ✨ sparkle button to generate AI description
   - Enter hours and rate
   - Add more services as needed

5. **Add Materials**:
   - Click "Add Material"
   - Type a brief description (e.g., "hydraulic oil")
   - Click the ✨ sparkle button to generate AI description
   - Enter quantity and price
   - Add more materials as needed

6. **Adjust Payment Details**:
   - Enter down payment if applicable
   - Set payment due date
   - Adjust discount if needed
   - Adjust tax percentage (default 20%)

7. **Export PDF**:
   - Review all information
   - Click "Export Work Order as PDF"
   - PDF will download automatically

## AI Description Generation

The AI description generator uses an intelligent system to create professional, detailed descriptions:

### Service Descriptions Include:
- Detailed work procedures
- Tools and equipment needed
- Expected outcomes
- Safety considerations
- Quality standards

### Material Descriptions Include:
- Technical specifications
- Quality standards
- Compatibility information
- Performance characteristics

### Supported Keywords:
- **Services**: pump, motor, valve, belt, filter, inspection, repair, maintenance
- **Materials**: oil, filter, seal, bearing, gasket, parts

The AI can understand context and generate appropriate descriptions even for custom inputs.

## Technical Details

### PDF Generation
- Uses jsPDF library for professional PDF creation
- A4 format, portrait orientation
- Matches industry-standard work order layout
- Includes all sections: contractor, client, schedule, payment, services, materials, totals

### API Endpoint
- **POST** `/api/home/ot/generate-description`
- Body: `{ type: 'service' | 'material', context: string }`
- Returns: `{ description: string }`

### Integration
To integrate with a real LLM API (OpenAI, Anthropic, etc.):
1. Add your API key to `.env.local`:
   ```
   OPENAI_API_KEY=your_key_here
   ```
2. Update the API route at `apps/web/app/api/home/ot/generate-description/route.ts`
3. Uncomment the OpenAI API call code
4. Remove the mock implementation

## Customization

### Company Information
Edit the `COMPANY_INFO` constant in `page.tsx`:
```typescript
const COMPANY_INFO = {
  name: 'Your Company Name',
  attn: 'Your Department',
  address: 'Your Address',
  city: 'Your City',
  zip: 'Your ZIP',
  phone: 'Your Phone',
  email: 'Your Email'
};
```

### Default Tax Rate
Change the default tax percentage in the initial state:
```typescript
tax: '20' // Change to your default tax rate
```

### PDF Styling
Modify the PDF layout in the `exportToPDF` function to match your branding.

## Tips for Best Results

1. **Service Descriptions**: Be specific in your initial description (e.g., "hydraulic pump repair" instead of just "pump")
2. **Material Descriptions**: Include the type or purpose (e.g., "hydraulic oil filter" instead of just "filter")
3. **Review AI Descriptions**: Always review and edit AI-generated descriptions as needed
4. **Save Templates**: Keep common services/materials documented for quick reference
5. **Client Database**: Consider maintaining a client database for faster form filling

## Future Enhancements

Potential improvements:
- Save work orders to database
- Client management system
- Service/material templates library
- Email work orders directly to clients
- Digital signatures
- Work order status tracking
- Historical work order search
- Recurring work orders
- Multi-language support
