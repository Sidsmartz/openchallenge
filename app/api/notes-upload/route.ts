import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const subject = formData.get("subject") as string;
        const unit = formData.get("unit") as string;

        if (!file || !subject || !unit) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Sanitize filename
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()
            .toString(36)
            .substring(7)}.${fileExt}`;
        const filePath = `${subject}/unit-${unit}/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from("notes")
            .upload(filePath, file);

        if (uploadError) {
            console.error("Upload error:", uploadError);
            return NextResponse.json(
                { error: "Failed to upload file" },
                { status: 500 }
            );
        }

        // Get Public URL
        const {
            data: { publicUrl },
        } = supabase.storage.from("notes").getPublicUrl(filePath);

        // Save to Database
        const { data: note, error: dbError } = await supabase
            .from("notes")
            .insert({
                subject,
                unit: parseInt(unit),
                filename: file.name,
                file_url: publicUrl,
            })
            .select()
            .single();

        if (dbError) {
            console.error("Database error:", dbError);
            return NextResponse.json(
                { error: "Failed to save note metadata" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, note });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
