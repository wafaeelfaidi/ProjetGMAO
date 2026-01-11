import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { type, context } = await request.json();

    if (!context) {
      return NextResponse.json(
        { error: 'Context is required' },
        { status: 400 }
      );
    }

    // Use OpenAI or any other LLM API
    // For this example, I'll use a mock implementation
    // Replace this with your actual LLM API call
    const description = await generateWithLLM(type, context);

    return NextResponse.json({ description });
  } catch (error) {
    console.error('Error generating description:', error);
    return NextResponse.json(
      { error: 'Failed to generate description' },
      { status: 500 }
    );
  }
}

async function generateWithLLM(type: 'service' | 'material', context: string): Promise<string> {
  // TODO: Replace with actual LLM API call (OpenAI, Anthropic, etc.)
  // Example with OpenAI:
  /*
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: type === 'service'
            ? 'You are a maintenance expert. Generate a detailed, professional description of the maintenance service based on the user\'s input. Be specific about the work involved, tools needed, and expected outcomes. Keep it under 200 words.'
            : 'You are a maintenance expert. Generate a detailed, professional description of the material or product based on the user\'s input. Include specifications, purpose, and any relevant technical details. Keep it under 200 words.'
        },
        {
          role: 'user',
          content: context
        }
      ],
      temperature: 0.7,
      max_tokens: 250
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
  */

  // Mock implementation for demonstration
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

  if (type === 'service') {
    const serviceDescriptions: { [key: string]: string } = {
      'pump': 'Complete hydraulic pump inspection and repair service including: disassembly of pump components, cleaning and inspection of all parts, replacement of worn seals and bearings, reassembly with proper torque specifications, pressure testing, and performance verification. Includes leak detection and correction.',
      'motor': 'Comprehensive electric motor maintenance including: winding inspection, bearing lubrication or replacement, rotor balancing, insulation testing, vibration analysis, alignment verification, and load testing. Ensures optimal performance and extends motor life.',
      'valve': 'Thorough valve maintenance service including: disassembly, seat inspection and lapping, seal replacement, stem polishing, actuator calibration, and leak testing. Ensures proper flow control and prevents system contamination.',
      'belt': 'Complete belt drive system service including: tension adjustment, alignment correction, pulley inspection, wear assessment, and replacement if necessary. Prevents premature failure and reduces energy consumption.',
      'filter': 'Filter system maintenance including: element replacement, housing inspection, seal verification, differential pressure testing, and system flushing. Maintains fluid cleanliness and protects downstream components.',
    };

    const lowerContext = context.toLowerCase();
    for (const [key, description] of Object.entries(serviceDescriptions)) {
      if (lowerContext.includes(key)) {
        return description;
      }
    }

    return `Professional maintenance service for ${context}. This comprehensive service includes thorough inspection of all components, identification of wear patterns and potential failure points, cleaning and lubrication of moving parts, replacement of worn components as needed, calibration and adjustment for optimal performance, and complete functional testing. All work performed according to manufacturer specifications and industry best practices.`;
  } else {
    const materialDescriptions: { [key: string]: string } = {
      'oil': 'Premium hydraulic oil meeting ISO VG specifications. Provides excellent wear protection, oxidation resistance, and thermal stability. Suitable for high-pressure hydraulic systems operating in demanding conditions. Meets or exceeds OEM requirements.',
      'filter': 'High-efficiency replacement filter element with micron-rated filtration media. Features robust construction, high dirt-holding capacity, and low pressure drop. Compatible with standard filter housings and provides superior contaminant removal.',
      'seal': 'Premium-grade mechanical seal kit including primary and secondary sealing elements, O-rings, and hardware. Manufactured from high-quality materials for excellent chemical resistance and temperature tolerance. Ensures leak-free operation.',
      'bearing': 'Precision-engineered bearing assembly with enhanced load capacity and extended service life. Features advanced seal design to retain lubricant and exclude contaminants. Pre-lubricated for immediate installation.',
      'gasket': 'Industrial-grade gasket material providing reliable sealing across a wide temperature and pressure range. Chemical resistant and dimensionally stable. Custom-cut for perfect fit and optimal sealing performance.',
    };

    const lowerContext = context.toLowerCase();
    for (const [key, description] of Object.entries(materialDescriptions)) {
      if (lowerContext.includes(key)) {
        return description;
      }
    }

    return `High-quality ${context} designed for industrial maintenance applications. This component meets stringent quality standards and is manufactured from durable materials for reliable long-term performance. Features precise dimensions for proper fit and function, corrosion-resistant finish, and compatibility with standard equipment. Includes all necessary hardware for installation.`;
  }
}
