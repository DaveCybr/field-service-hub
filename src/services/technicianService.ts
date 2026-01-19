/**
 * ============================================
 * FILE: 05_technicianService.ts
 * LOCATION: src/services/technicianService.ts
 * DESCRIPTION: Service layer untuk Technician Module
 * ============================================
 */

/**
 * CARA PAKAI:
 *
 * 1. Copy file ini ke: src/services/technicianService.ts
 * 2. Setup Supabase client (lihat bagian SUPABASE CLIENT)
 * 3. Import di component: import { technicianService } from '@/services/technicianService';
 * 4. Use async/await: const data = await technicianService.getAll();
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  Technician,
  TechnicianAssignment,
  LocationLog,
  PhotoLog,
  CreateTechnicianInput,
  UpdateTechnicianInput,
  CreateAssignmentInput,
  UpdateAssignmentInput,
  LogLocationInput,
  UploadPhotoInput,
  TechnicianWithAssignments,
  AssignmentWithDetails,
  TechnicianFilters,
  AssignmentFilters,
} from "../types/technician.types";

// ============================================
// SUPABASE CLIENT SETUP
// ============================================

/**
 * Setup Supabase Client
 *
 * Environment variables yang dibutuhkan:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Tambahkan di file .env.local:
 * ```
 * NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
 * NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
 * ```
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables!");
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// ============================================
// TECHNICIAN SERVICE
// CRUD operations untuk table technicians
// ============================================

export const technicianService = {
  /**
   * GET ALL TECHNICIANS
   * Mengambil semua data teknisi dengan jumlah assignments
   *
   * @returns Promise<Technician[]>
   *
   * @example
   * ```typescript
   * const technicians = await technicianService.getAll();
   * console.log('Total teknisi:', technicians.length);
   * ```
   */
  async getAll(): Promise<Technician[]> {
    const { data, error } = await supabase
      .from("technicians")
      .select(
        `
        *,
        assignments:technician_assignments(count)
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[technicianService.getAll] Error:", error);
      throw new Error(`Failed to fetch technicians: ${error.message}`);
    }

    return data || [];
  },

  /**
   * GET BY ID
   * Mengambil detail teknisi berdasarkan ID
   * Termasuk semua assignments dengan info invoice
   *
   * @param id - UUID teknisi
   * @returns Promise<TechnicianWithAssignments>
   *
   * @example
   * ```typescript
   * const tech = await technicianService.getById('uuid-here');
   * console.log('Nama:', tech.name);
   * console.log('Assignments:', tech.assignments?.length);
   * ```
   */
  async getById(id: string): Promise<TechnicianWithAssignments> {
    const { data, error } = await supabase
      .from("technicians")
      .select(
        `
        *,
        assignments:technician_assignments(
          *,
          invoice:invoices(
            invoice_number,
            customer_name,
            service_type,
            status
          )
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("[technicianService.getById] Error:", error);
      throw new Error(`Failed to fetch technician: ${error.message}`);
    }

    return data;
  },

  /**
   * GET AVAILABLE TECHNICIANS
   * Mengambil teknisi dengan status 'available'
   *
   * @returns Promise<Technician[]>
   *
   * @example
   * ```typescript
   * const available = await technicianService.getAvailable();
   * // Use untuk dropdown assign technician
   * ```
   */
  async getAvailable(): Promise<Technician[]> {
    const { data, error } = await supabase
      .from("technicians")
      .select("*")
      .eq("status", "available")
      .order("name");

    if (error) {
      console.error("[technicianService.getAvailable] Error:", error);
      throw new Error(
        `Failed to fetch available technicians: ${error.message}`
      );
    }

    return data || [];
  },

  /**
   * CREATE TECHNICIAN
   * Membuat teknisi baru
   *
   * @param input - Data teknisi baru
   * @returns Promise<Technician>
   *
   * @example
   * ```typescript
   * const newTech = await technicianService.create({
   *   name: 'John Doe',
   *   email: 'john@example.com',
   *   phone: '081234567890',
   *   specialization: ['AC', 'Kulkas'],
   *   status: 'available'
   * });
   * ```
   */
  async create(input: CreateTechnicianInput): Promise<Technician> {
    const { data, error } = await supabase
      .from("technicians")
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error("[technicianService.create] Error:", error);
      throw new Error(`Failed to create technician: ${error.message}`);
    }

    return data;
  },

  /**
   * UPDATE TECHNICIAN
   * Update data teknisi
   *
   * @param id - UUID teknisi
   * @param updates - Field yang mau diupdate
   * @returns Promise<Technician>
   *
   * @example
   * ```typescript
   * await technicianService.update('uuid', {
   *   phone: '081234567891',
   *   specialization: ['AC', 'Kulkas', 'Mesin Cuci']
   * });
   * ```
   */
  async update(
    id: string,
    updates: UpdateTechnicianInput
  ): Promise<Technician> {
    const { data, error } = await supabase
      .from("technicians")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[technicianService.update] Error:", error);
      throw new Error(`Failed to update technician: ${error.message}`);
    }

    return data;
  },

  /**
   * UPDATE STATUS
   * Update status ketersediaan teknisi
   *
   * @param id - UUID teknisi
   * @param status - Status baru (available/busy/off_duty)
   * @returns Promise<Technician>
   *
   * @example
   * ```typescript
   * // Set teknisi jadi busy saat assign
   * await technicianService.updateStatus('uuid', 'busy');
   *
   * // Set jadi available saat selesai
   * await technicianService.updateStatus('uuid', 'available');
   * ```
   */
  async updateStatus(
    id: string,
    status: Technician["status"]
  ): Promise<Technician> {
    return this.update(id, { status });
  },

  /**
   * UPDATE LOCATION
   * Update lokasi current teknisi
   *
   * @param id - UUID teknisi
   * @param latitude - Koordinat latitude
   * @param longitude - Koordinat longitude
   * @returns Promise<Technician>
   *
   * @example
   * ```typescript
   * // Update dari GPS tracking
   * await technicianService.updateLocation(
   *   'uuid',
   *   -6.1234,
   *   106.5678
   * );
   * ```
   */
  async updateLocation(
    id: string,
    latitude: number,
    longitude: number
  ): Promise<Technician> {
    return this.update(id, {
      current_location: {
        latitude,
        longitude,
        updated_at: new Date().toISOString(),
      },
    });
  },

  /**
   * DELETE TECHNICIAN
   * Hapus teknisi
   *
   * @param id - UUID teknisi
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * await technicianService.delete('uuid');
   * ```
   *
   * @note
   * - Akan cascade delete semua assignments
   * - Pastikan confirm ke user sebelum delete
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("technicians").delete().eq("id", id);

    if (error) {
      console.error("[technicianService.delete] Error:", error);
      throw new Error(`Failed to delete technician: ${error.message}`);
    }
  },

  /**
   * SEARCH TECHNICIANS
   * Cari teknisi dengan filters
   *
   * @param filters - Filter options
   * @returns Promise<Technician[]>
   *
   * @example
   * ```typescript
   * const results = await technicianService.search({
   *   status: 'available',
   *   search: 'john',
   *   specialization: 'AC'
   * });
   * ```
   */
  async search(filters: TechnicianFilters): Promise<Technician[]> {
    let query = supabase.from("technicians").select("*");

    // Filter by status
    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    // Filter by specialization
    if (filters.specialization) {
      query = query.contains("specialization", [filters.specialization]);
    }

    // Search by name or email
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
      );
    }

    query = query.order("name");

    const { data, error } = await query;

    if (error) {
      console.error("[technicianService.search] Error:", error);
      throw new Error(`Failed to search technicians: ${error.message}`);
    }

    return data || [];
  },
};

// ============================================
// ASSIGNMENT SERVICE
// CRUD operations untuk penugasan teknisi
// ============================================

export const assignmentService = {
  /**
   * GET ALL ASSIGNMENTS
   * Mengambil semua penugasan dengan detail
   *
   * @returns Promise<AssignmentWithDetails[]>
   */
  async getAll(): Promise<AssignmentWithDetails[]> {
    const { data, error } = await supabase
      .from("technician_assignments")
      .select(
        `
        *,
        technician:technicians(*),
        invoice:invoices(
          invoice_number,
          customer_name,
          customer_phone,
          service_type,
          device_info,
          problem_description,
          status
        )
      `
      )
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("[assignmentService.getAll] Error:", error);
      throw new Error(`Failed to fetch assignments: ${error.message}`);
    }

    return data || [];
  },

  /**
   * GET BY ID
   * Mengambil detail assignment lengkap
   * Termasuk location logs dan photo logs
   *
   * @param id - UUID assignment
   * @returns Promise<AssignmentWithDetails>
   */
  async getById(id: string): Promise<AssignmentWithDetails> {
    const { data, error } = await supabase
      .from("technician_assignments")
      .select(
        `
        *,
        technician:technicians(*),
        invoice:invoices(*),
        location_logs(*),
        photo_logs(*)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("[assignmentService.getById] Error:", error);
      throw new Error(`Failed to fetch assignment: ${error.message}`);
    }

    return data;
  },

  /**
   * GET BY TECHNICIAN
   * Mengambil assignments dari teknisi tertentu
   *
   * @param technicianId - UUID teknisi
   * @returns Promise<AssignmentWithDetails[]>
   */
  async getByTechnician(
    technicianId: string
  ): Promise<AssignmentWithDetails[]> {
    const { data, error } = await supabase
      .from("technician_assignments")
      .select(
        `
        *,
        invoice:invoices(
          invoice_number,
          customer_name,
          service_type,
          status
        )
      `
      )
      .eq("technician_id", technicianId)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("[assignmentService.getByTechnician] Error:", error);
      throw new Error(
        `Failed to fetch technician assignments: ${error.message}`
      );
    }

    return data || [];
  },

  /**
   * GET ACTIVE BY TECHNICIAN
   * Mengambil assignment aktif (assigned atau in_progress)
   *
   * @param technicianId - UUID teknisi
   * @returns Promise<AssignmentWithDetails[]>
   */
  async getActiveByTechnician(
    technicianId: string
  ): Promise<AssignmentWithDetails[]> {
    const { data, error } = await supabase
      .from("technician_assignments")
      .select(
        `
        *,
        invoice:invoices(*)
      `
      )
      .eq("technician_id", technicianId)
      .in("status", ["assigned", "in_progress"])
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("[assignmentService.getActiveByTechnician] Error:", error);
      throw new Error(`Failed to fetch active assignments: ${error.message}`);
    }

    return data || [];
  },

  /**
   * CREATE ASSIGNMENT
   * Assign teknisi ke invoice
   *
   * @param input - Data assignment
   * @returns Promise<TechnicianAssignment>
   *
   * @example
   * ```typescript
   * const assignment = await assignmentService.create({
   *   invoice_id: 'invoice-uuid',
   *   technician_id: 'tech-uuid',
   *   notes: 'Urgent - AC rusak total'
   * });
   * ```
   *
   * @note
   * - Auto update technician status jadi 'busy'
   * - Auto update invoice status jadi 'assigned'
   */
  async create(input: CreateAssignmentInput): Promise<TechnicianAssignment> {
    // Update technician status to busy
    await technicianService.updateStatus(input.technician_id, "busy");

    // Update invoice status to assigned
    await supabase
      .from("invoices")
      .update({ status: "assigned" })
      .eq("id", input.invoice_id);

    // Create assignment
    const { data, error } = await supabase
      .from("technician_assignments")
      .insert({
        ...input,
        status: input.status || "assigned",
      })
      .select()
      .single();

    if (error) {
      console.error("[assignmentService.create] Error:", error);
      throw new Error(`Failed to create assignment: ${error.message}`);
    }

    return data;
  },

  /**
   * UPDATE ASSIGNMENT
   * Update data assignment
   *
   * @param id - UUID assignment
   * @param updates - Field yang mau diupdate
   * @returns Promise<TechnicianAssignment>
   */
  async update(
    id: string,
    updates: UpdateAssignmentInput
  ): Promise<TechnicianAssignment> {
    const { data, error } = await supabase
      .from("technician_assignments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[assignmentService.update] Error:", error);
      throw new Error(`Failed to update assignment: ${error.message}`);
    }

    return data;
  },

  /**
   * START ASSIGNMENT
   * Mulai pekerjaan (set status jadi in_progress)
   *
   * @param id - UUID assignment
   * @returns Promise<TechnicianAssignment>
   *
   * @example
   * ```typescript
   * // Saat teknisi check-in dan mulai kerja
   * await assignmentService.start('assignment-uuid');
   * ```
   *
   * @note
   * - Set started_at ke timestamp sekarang
   * - Update invoice status jadi 'in_progress'
   */
  async start(id: string): Promise<TechnicianAssignment> {
    // Update invoice status
    const assignment = await this.getById(id);
    await supabase
      .from("invoices")
      .update({ status: "in_progress" })
      .eq("id", assignment.invoice_id);

    return this.update(id, {
      status: "in_progress",
      started_at: new Date().toISOString(),
    });
  },

  /**
   * COMPLETE ASSIGNMENT
   * Selesaikan pekerjaan
   *
   * @param id - UUID assignment
   * @param notes - Catatan hasil pekerjaan (optional)
   * @returns Promise<TechnicianAssignment>
   *
   * @example
   * ```typescript
   * await assignmentService.complete(
   *   'assignment-uuid',
   *   'AC sudah diperbaiki, filter diganti baru'
   * );
   * ```
   *
   * @note
   * - Set completed_at ke timestamp sekarang
   * - Update technician status jadi 'available'
   * - Update invoice status jadi 'completed'
   */
  async complete(id: string, notes?: string): Promise<TechnicianAssignment> {
    const assignment = await this.getById(id);

    // Update technician status to available
    await technicianService.updateStatus(assignment.technician_id, "available");

    // Update invoice status to completed
    await supabase
      .from("invoices")
      .update({ status: "completed" })
      .eq("id", assignment.invoice_id);

    return this.update(id, {
      status: "completed",
      completed_at: new Date().toISOString(),
      notes,
    });
  },

  /**
   * CANCEL ASSIGNMENT
   * Batalkan penugasan
   *
   * @param id - UUID assignment
   * @param notes - Alasan pembatalan
   * @returns Promise<TechnicianAssignment>
   *
   * @note
   * - Update technician status jadi 'available'
   * - Update invoice status kembali jadi 'pending'
   */
  async cancel(id: string, notes?: string): Promise<TechnicianAssignment> {
    const assignment = await this.getById(id);

    // Update technician status to available
    await technicianService.updateStatus(assignment.technician_id, "available");

    // Update invoice status back to pending
    await supabase
      .from("invoices")
      .update({ status: "pending" })
      .eq("id", assignment.invoice_id);

    return this.update(id, {
      status: "cancelled",
      notes,
    });
  },

  /**
   * SEARCH ASSIGNMENTS
   * Cari assignments dengan filters
   *
   * @param filters - Filter options
   * @returns Promise<AssignmentWithDetails[]>
   */
  async search(filters: AssignmentFilters): Promise<AssignmentWithDetails[]> {
    let query = supabase.from("technician_assignments").select(`
        *,
        technician:technicians(*),
        invoice:invoices(*)
      `);

    // Filter by status
    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    // Filter by technician
    if (filters.technician_id) {
      query = query.eq("technician_id", filters.technician_id);
    }

    // Filter by date range
    if (filters.date_from) {
      query = query.gte("assigned_at", filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte("assigned_at", filters.date_to);
    }

    query = query.order("assigned_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("[assignmentService.search] Error:", error);
      throw new Error(`Failed to search assignments: ${error.message}`);
    }

    return data || [];
  },
};

// ============================================
// LOCATION SERVICE
// GPS tracking operations
// ============================================

export const locationService = {
  /**
   * LOG LOCATION
   * Catat lokasi teknisi
   *
   * @param input - Data lokasi
   * @returns Promise<LocationLog>
   *
   * @example
   * ```typescript
   * // Saat check-in
   * await locationService.logLocation({
   *   assignment_id: 'uuid',
   *   latitude: -6.1234,
   *   longitude: 106.5678,
   *   activity_type: 'check_in',
   *   accuracy: 10.5
   * });
   * ```
   *
   * @note
   * - Auto update current_location di table technicians
   */
  async logLocation(input: LogLocationInput): Promise<LocationLog> {
    // Insert location log
    const { data, error } = await supabase
      .from("location_logs")
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error("[locationService.logLocation] Error:", error);
      throw new Error(`Failed to log location: ${error.message}`);
    }

    // Update technician's current location
    const assignment = await assignmentService.getById(input.assignment_id);
    await technicianService.updateLocation(
      assignment.technician_id,
      input.latitude,
      input.longitude
    );

    return data;
  },

  /**
   * GET HISTORY
   * Ambil history lokasi dari assignment
   *
   * @param assignmentId - UUID assignment
   * @returns Promise<LocationLog[]>
   */
  async getHistory(assignmentId: string): Promise<LocationLog[]> {
    const { data, error } = await supabase
      .from("location_logs")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("recorded_at", { ascending: true });

    if (error) {
      console.error("[locationService.getHistory] Error:", error);
      throw new Error(`Failed to fetch location history: ${error.message}`);
    }

    return data || [];
  },

  /**
   * GET CURRENT LOCATION
   * Ambil lokasi terakhir dari assignment
   *
   * @param assignmentId - UUID assignment
   * @returns Promise<LocationLog | null>
   */
  async getCurrent(assignmentId: string): Promise<LocationLog | null> {
    const { data, error } = await supabase
      .from("location_logs")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No data found
        return null;
      }
      console.error("[locationService.getCurrent] Error:", error);
      throw new Error(`Failed to fetch current location: ${error.message}`);
    }

    return data;
  },
};

// ============================================
// PHOTO SERVICE
// Photo upload and management operations
// ============================================

export const photoService = {
  /**
   * UPLOAD PHOTO
   * Upload foto dokumentasi pekerjaan
   *
   * @param input - Data foto dan file
   * @returns Promise<PhotoLog>
   *
   * @example
   * ```typescript
   * const file = event.target.files[0];
   * const photo = await photoService.upload({
   *   assignment_id: 'uuid',
   *   file: file,
   *   photo_type: 'progress',
   *   description: 'Membersihkan filter AC',
   *   location: { latitude: -6.1234, longitude: 106.5678 }
   * });
   * ```
   */
  async upload(input: UploadPhotoInput): Promise<PhotoLog> {
    // Generate filename
    const fileExt = input.file.name.split(".").pop();
    const fileName = `${input.assignment_id}/${Date.now()}-${
      input.photo_type
    }.${fileExt}`;
    const filePath = fileName;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from("technician-photos")
      .upload(filePath, input.file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[photoService.upload] Upload error:", uploadError);
      throw new Error(`Failed to upload photo: ${uploadError.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("technician-photos").getPublicUrl(filePath);

    // Save metadata to database
    const { data, error } = await supabase
      .from("photo_logs")
      .insert({
        assignment_id: input.assignment_id,
        photo_url: publicUrl,
        photo_type: input.photo_type,
        description: input.description,
        location: input.location,
      })
      .select()
      .single();

    if (error) {
      console.error("[photoService.upload] Database error:", error);
      throw new Error(`Failed to save photo metadata: ${error.message}`);
    }

    return data;
  },

  /**
   * GET BY ASSIGNMENT
   * Ambil semua foto dari assignment
   *
   * @param assignmentId - UUID assignment
   * @returns Promise<PhotoLog[]>
   */
  async getByAssignment(assignmentId: string): Promise<PhotoLog[]> {
    const { data, error } = await supabase
      .from("photo_logs")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("uploaded_at", { ascending: true });

    if (error) {
      console.error("[photoService.getByAssignment] Error:", error);
      throw new Error(`Failed to fetch photos: ${error.message}`);
    }

    return data || [];
  },

  /**
   * GET BY TYPE
   * Ambil foto berdasarkan tipe
   *
   * @param assignmentId - UUID assignment
   * @param photoType - Jenis foto
   * @returns Promise<PhotoLog[]>
   */
  async getByType(
    assignmentId: string,
    photoType: PhotoLog["photo_type"]
  ): Promise<PhotoLog[]> {
    const { data, error } = await supabase
      .from("photo_logs")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("photo_type", photoType)
      .order("uploaded_at", { ascending: true });

    if (error) {
      console.error("[photoService.getByType] Error:", error);
      throw new Error(`Failed to fetch photos by type: ${error.message}`);
    }

    return data || [];
  },

  /**
   * DELETE PHOTO
   * Hapus foto dari storage dan database
   *
   * @param id - UUID photo log
   * @returns Promise<void>
   */
  async delete(id: string): Promise<void> {
    // Get photo data first
    const { data: photo, error: fetchError } = await supabase
      .from("photo_logs")
      .select("photo_url")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("[photoService.delete] Fetch error:", fetchError);
      throw new Error(`Failed to fetch photo data: ${fetchError.message}`);
    }

    // Extract file path from URL
    const urlParts = photo.photo_url.split("/");
    const filePath = urlParts.slice(-2).join("/");

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("technician-photos")
      .remove([filePath]);

    if (storageError) {
      console.error("[photoService.delete] Storage error:", storageError);
      throw new Error(
        `Failed to delete photo from storage: ${storageError.message}`
      );
    }

    // Delete from database
    const { error } = await supabase.from("photo_logs").delete().eq("id", id);

    if (error) {
      console.error("[photoService.delete] Database error:", error);
      throw new Error(`Failed to delete photo metadata: ${error.message}`);
    }
  },
};

// ============================================
// GPS UTILITIES
// Helper functions untuk GPS operations
// ============================================

export const gpsUtils = {
  /**
   * GET CURRENT POSITION
   * Ambil koordinat GPS current dari browser
   *
   * @returns Promise<GeolocationPosition>
   *
   * @example
   * ```typescript
   * try {
   *   const position = await gpsUtils.getCurrentPosition();
   *   console.log('Lat:', position.coords.latitude);
   *   console.log('Lng:', position.coords.longitude);
   * } catch (error) {
   *   console.error('GPS error:', error);
   * }
   * ```
   */
  getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation tidak didukung oleh browser ini"));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  },

  /**
   * WATCH POSITION
   * Monitor perubahan lokasi secara real-time
   *
   * @param onSuccess - Callback saat lokasi update
   * @param onError - Callback saat error (optional)
   * @returns Watch ID untuk clearWatch
   *
   * @example
   * ```typescript
   * const watchId = gpsUtils.watchPosition(
   *   (position) => {
   *     console.log('Location updated:', position.coords);
   *   },
   *   (error) => {
   *     console.error('GPS error:', error);
   *   }
   * );
   *
   * // Stop watching
   * navigator.geolocation.clearWatch(watchId);
   * ```
   */
  watchPosition(
    onSuccess: (position: GeolocationPosition) => void,
    onError?: (error: GeolocationPositionError) => void
  ): number {
    if (!navigator.geolocation) {
      throw new Error("Geolocation tidak didukung oleh browser ini");
    }

    return navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    });
  },

  /**
   * CALCULATE DISTANCE
   * Hitung jarak antara 2 koordinat GPS (Haversine formula)
   *
   * @param lat1 - Latitude point 1
   * @param lon1 - Longitude point 1
   * @param lat2 - Latitude point 2
   * @param lon2 - Longitude point 2
   * @returns Jarak dalam kilometer
   *
   * @example
   * ```typescript
   * const distance = gpsUtils.calculateDistance(
   *   -6.1234, 106.5678,  // Point A
   *   -6.1244, 106.5688   // Point B
   * );
   * console.log(`Jarak: ${distance.toFixed(2)} km`);
   * ```
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * FORMAT COORDINATES
   * Format koordinat GPS ke string yang readable
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns String format "lat, lng"
   */
  formatCoordinates(lat: number, lng: number): string {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  },

  /**
   * GET GOOGLE MAPS URL
   * Generate URL untuk buka di Google Maps
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Google Maps URL
   *
   * @example
   * ```typescript
   * const url = gpsUtils.getGoogleMapsUrl(-6.1234, 106.5678);
   * window.open(url, '_blank');
   * ```
   */
  getGoogleMapsUrl(lat: number, lng: number): string {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  },
};

// ============================================
// EXPORT ALL SERVICES
// ============================================

export default {
  technicianService,
  assignmentService,
  locationService,
  photoService,
  gpsUtils,
  supabase,
};
