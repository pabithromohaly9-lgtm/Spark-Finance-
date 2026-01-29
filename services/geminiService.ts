
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, FinancialSummary, Insight } from "../types";

export const getFinancialInsights = async (
  transactions: Transaction[],
  summary: FinancialSummary
): Promise<Insight[]> => {
  // Ensure the API key is present
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key is missing. Falling back to default message.");
    return [{
      title: "এআই সিস্টেম আপডেট",
      description: "এআই পরামর্শ পেতে সিস্টেম কনফিগারেশন চেক করুন।",
      type: "info"
    }];
  }

  const ai = new GoogleGenAI({ apiKey });

  const recentTransactions = transactions.slice(0, 15).map(t => ({
    type: t.type,
    amount: t.amount,
    category: t.category,
    date: t.date.split('T')[0]
  }));

  const prompt = `
    তুমি একজন দক্ষ ব্যক্তিগত আর্থিক উপদেষ্টা। নিচের আর্থিক সারাংশ বিশ্লেষণ করো এবং ৩টি গুরুত্বপূর্ণ পরামর্শ দাও।
    
    চলতি মাসের সারাংশ:
    - বর্তমান ব্যালেন্স: ৳${summary.balance}
    - মোট আয়: ৳${summary.totalIncome}
    - মোট ব্যয়: ৳${summary.totalExpenses}
    - গত মাসের সঞ্চয়: ৳${summary.previousMonthSavings}
    
    ক্যাটাগরি অনুযায়ী খরচ:
    ${JSON.stringify(summary.categoryBreakdown)}

    সাম্প্রতিক লেনদেন:
    ${JSON.stringify(recentTransactions)}

    নিয়ম:
    ১. উত্তর অবশ্যই বাংলা ভাষায় হতে হবে।
    ২. পরামর্শগুলো বাস্তবসম্মত এবং সহজ হতে হবে।
    ৩. উত্তরটি JSON ফরম্যাটে দাও যেখানে title, description এবং type ('success', 'warning', 'info') থাকবে।
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
              title: { 
                type: Type.STRING,
                description: 'আর্থিক পরামর্শের শিরোনাম।'
              },
              description: { 
                type: Type.STRING,
                description: 'বিস্তারিত ব্যাখ্যা।'
              },
              type: { 
                type: Type.STRING,
                description: "'success', 'warning', অথবা 'info'"
              },
            },
            required: ["title", "description", "type"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];

    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      return [
        {
          title: "বিশ্লেষণ সম্পন্ন",
          description: "আপনার খরচগুলো নিয়ন্ত্রিত আছে। অপ্রয়োজনীয় খরচ এড়িয়ে চলার চেষ্টা করুন।",
          type: "info"
        }
      ];
    }
  } catch (error) {
    console.error("Error fetching financial insights:", error);
    return [
      {
        title: "কোচ প্রস্তুত হচ্ছে",
        description: "আপনার লেনদেনগুলো আরও বিশ্লেষণ করা হচ্ছে। কিছু সময় পর আবার চেষ্টা করুন।",
        type: "info"
      }
    ];
  }
};
