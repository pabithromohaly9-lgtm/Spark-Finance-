
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, FinancialSummary, Insight } from "../types";

export const getFinancialInsights = async (
  transactions: Transaction[],
  summary: FinancialSummary
): Promise<Insight[]> => {
  // Ensure the API key is present
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key is missing.");
    return [{
      title: "এআই সিস্টেম আপডেট",
      description: "এআই পরামর্শ পেতে আপনার সিস্টেম সেটিংস থেকে এপিআই কী চেক করুন।",
      type: "info"
    }];
  }

  // Create instance right before use
  const ai = new GoogleGenAI({ apiKey });

  const recentTransactions = transactions.slice(0, 10).map(t => ({
    type: t.type,
    amount: t.amount,
    category: t.category,
    note: t.note
  }));

  const prompt = `
    তুমি একজন দক্ষ ব্যক্তিগত আর্থিক উপদেষ্টা। নিচের আর্থিক ডেটা বিশ্লেষণ করো এবং ৩টি গুরুত্বপূর্ণ ও বাস্তবসম্মত পরামর্শ দাও।
    
    চলতি মাসের বর্তমান অবস্থা:
    - বর্তমান ব্যালেন্স: ৳${summary.balance}
    - মোট আয়: ৳${summary.totalIncome}
    - মোট ব্যয়: ৳${summary.totalExpenses}
    
    ক্যাটাগরি অনুযায়ী খরচ:
    ${JSON.stringify(summary.categoryBreakdown)}

    সাম্প্রতিক কিছু লেনদেন:
    ${JSON.stringify(recentTransactions)}

    নিয়ম:
    ১. উত্তর অবশ্যই বাংলা ভাষায় হতে হবে।
    ২. পরামর্শগুলো সহজ ভাষায় ও অ্যাকশনেবল হতে হবে।
    ৩. উত্তরটি JSON ফরম্যাটে দাও যেখানে array of objects থাকবে। প্রতিটি অবজেক্টে title, description এবং type ('success' অথবা 'info') প্রপার্টি থাকবে।
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              type: { type: Type.STRING },
            },
            required: ["title", "description", "type"],
          },
        },
      },
    });

    const result = response.text;
    if (!result) return [];
    
    return JSON.parse(result.trim());
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [{
      title: "বিশ্লেষণ সমস্যা",
      description: "সার্ভারের সাথে সংযোগ করা যাচ্ছে না। দয়া করে ইন্টারনেট সংযোগ চেক করে আবার চেষ্টা করুন।",
      type: "info"
    }];
  }
};
