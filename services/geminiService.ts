
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, FinancialSummary, Insight } from "../types";

export const getFinancialInsights = async (
  transactions: Transaction[],
  summary: FinancialSummary
): Promise<Insight[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const recentTransactions = transactions.slice(-20).map(t => ({
    type: t.type,
    amount: t.amount,
    category: t.category,
    date: t.date.split('T')[0]
  }));

  const prompt = `
    আর্থিক ডেটা বিশ্লেষণ করুন এবং ৩টি ছোট, বন্ধুত্বপূর্ণ এবং ব্যবহারিক পরামর্শ (Insight) প্রদান করুন। অবশ্যই সম্পূর্ণ উত্তরটি বাংলা ভাষায় হতে হবে।
    
    চলতি মাসের সারাংশ:
    - মোট আয়: ৳${summary.totalIncome}
    - মোট ব্যয়: ৳${summary.totalExpenses}
    - বর্তমান সঞ্চয়: ৳${summary.savings}
    - গত মাসের সঞ্চয়: ৳${summary.previousMonthSavings}
    
    সাম্প্রতিক লেনদেন:
    ${JSON.stringify(recentTransactions)}

    খরচ কমানোর উপায় বা উন্নতির ক্ষেত্রগুলোতে মনোযোগ দিন। পরামর্শগুলো বাস্তবসম্মত এবং সহজবোধ্য হতে হবে। কোনো আইনি পরামর্শ দেবেন না।
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
                description: 'আর্থিক পর্যবেক্ষণের একটি সংক্ষিপ্ত শিরোনাম (বাংলায়)।'
              },
              description: { 
                type: Type.STRING,
                description: 'একটি বন্ধুত্বপূর্ণ এবং ব্যবহারিক ব্যাখ্যা বা টিপস (বাংলায়)।'
              },
              type: { 
                type: Type.STRING,
                description: "ইনসাইটের ধরন: 'success', 'warning', অথবা 'info'"
              },
            },
            required: ["title", "description", "type"],
            propertyOrdering: ["title", "description", "type"],
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
      throw parseError;
    }
  } catch (error) {
    console.error("Error fetching financial insights:", error);
    return [
      {
        title: "বিশ্লেষণ করতে প্রস্তুত",
        description: "আপনার এআই কোচের কাছ থেকে ব্যক্তিগত পরামর্শ পেতে আরও কিছু লেনদেন যোগ করুন।",
        type: "info"
      }
    ];
  }
};
