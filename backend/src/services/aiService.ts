// backend/src/services/aiService.ts
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const generateRecommendation = async (exceptionId: string) => {
  // 1. Fetch the full context of the exception
  const exception = await prisma.exception.findUnique({
    where: { id: exceptionId },
    include: {
      rule: true,
      normalizedRecord: {
        include: { rawRecord: true }
      }
    }
  });

  if (!exception || !exception.normalizedRecord) {
    throw new Error('Exception or related record not found');
  }

  // 2. Build the strict prompt
  const prompt = `
    You are an expert loan data governance assistant. 
    A loan record has flagged a validation error. 
    
    Rule Violated: ${exception.rule.description} (Severity: ${exception.severity})
    
    Raw Uploaded Row (Immutable):
    ${exception.normalizedRecord.rawRecord.rawData}
    
    Parsed System Record (Current State):
    ${JSON.stringify(exception.normalizedRecord, null, 2)}
    
    Task:
    1. Explain exactly why this record failed the rule (be concise).
    2. Suggest a specific correction for the parsed data based on context clues.
    
    You must respond ONLY with a valid JSON object in this exact format:
    {
      "explanation": "Your concise explanation here",
      "suggestedCorrection": {
        "fieldName": "suggested_value"
      },
      "confidence": "High, Medium, or Low"
    }
  `;

  console.log(`Calling AI for exception: ${exceptionId}...`);

  let aiResponseText = "";
  let modelUsed = "gpt-3.5-turbo";

  try {
    // 3. Attempt to call the real AI Model
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" } 
    });
    aiResponseText = completion.choices[0].message.content || '{}';
    
  } catch (error: any) {
    console.log("⚠️ OpenAI API failed (likely quota limit). Falling back to mock AI response for hackathon demo.");
    
    // 3b. Hackathon Fallback: Simulate the AI response based on the rule
    modelUsed = "mock-ai-fallback";
    let mockSuggestion = {};
    
    if (exception.ruleId === "negative_balance") {
      mockSuggestion = {
        explanation: "The current_balance is negative, which frequently occurs due to reversed accounting entries or minus signs bleeding into the CSV formatting.",
        suggestedCorrection: { "currentBalance": Math.abs(exception.normalizedRecord.currentBalance || 0) },
        confidence: "High"
      };
    } else {
      mockSuggestion = {
        explanation: `The record violates the ${exception.ruleId} rule. Manual review of the source document is recommended.`,
        suggestedCorrection: { "status": "flag_for_review" },
        confidence: "Medium"
      };
    }
    
    aiResponseText = JSON.stringify(mockSuggestion, null, 2);
  }

  // 4. Save the Recommendation to the Database for Traceability
  const recommendation = await prisma.aiRecommendation.create({
    data: {
      exceptionId,
      prompt,
      model: modelUsed,
      response: aiResponseText,
      status: 'pending',
    }
  });

  return recommendation;
};