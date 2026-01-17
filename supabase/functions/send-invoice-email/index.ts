// supabase/functions/send-invoice-email/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { invoiceId, invoiceNumber, to, cc, subject, message } =
      await req.json();

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Fetch invoice data
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("invoices")
      .select(
        `
        *,
        customer:customers(name, email),
        services:invoice_services(*),
        items:invoice_items(*)
      `
      )
      .eq("id", invoiceId)
      .single();

    if (invoiceError) throw invoiceError;

    // Generate PDF (simplified - you can use a template)
    const pdfContent = generateInvoicePDF(invoice);

    // Send email using Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "invoices@yourcompany.com",
        to: [to],
        cc: cc ? [cc] : undefined,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <p>${message.replace(/\n/g, "<br>")}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              This is an automated email. Please do not reply.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `${invoiceNumber}.pdf`,
            content: pdfContent,
          },
        ],
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.json();
      throw new Error(error.message || "Failed to send email");
    }

    const result = await emailResponse.json();

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

function generateInvoicePDF(invoice: any): string {
  // Simple PDF generation - you should use a proper PDF library
  // This is a placeholder - implement with jsPDF or similar
  const pdfBase64 = ""; // Generate PDF here
  return pdfBase64;
}
