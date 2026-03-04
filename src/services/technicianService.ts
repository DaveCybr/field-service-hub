/**
 * ============================================
 * FILE: technicianService.ts
 * LOCATION: src/services/technicianService.ts
 * ============================================
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  Employee,
  ServiceAssignment,
  TechnicianLocation,
  CreateAssignmentInput,
  UpdateAssignmentInput,
  UpdateEmployeeInput,
  AssignmentWithDetails,
  EmployeeWithStats,
  EmployeeFilters,
  AssignmentFilters,
} from "@/types/technician.types";

// ============================================
// TECHNICIAN SERVICE
// Operasi CRUD untuk tabel employees (role: technician)
// ============================================

export const technicianService = {
  /**
   * Ambil semua teknisi beserta jumlah pekerjaan aktif
   */
  async getAll(): Promise<EmployeeWithStats[]> {
    const { data, error } = await supabase
      .from("employees")
      .select(
        `
        *,
        active_jobs:invoice_services!assigned_technician_id(count)
      `,
      )
      .eq("role", "technician")
      .order("name");

    if (error) {
      console.error("[technicianService.getAll] Error:", error);
      throw new Error(`Gagal mengambil data teknisi: ${error.message}`);
    }

    return (data || []).map((t) => ({
      ...t,
      active_jobs_count: t.active_jobs?.[0]?.count || 0,
    }));
  },

  /**
   * Ambil detail teknisi berdasarkan ID beserta riwayat assignment
   */
  async getById(id: string): Promise<EmployeeWithStats> {
    const { data, error } = await supabase
      .from("employees")
      .select(
        `
        *,
        active_jobs:invoice_services!assigned_technician_id(count),
        assignments:service_technician_assignments(
          *,
          invoice:invoices(invoice_number, status),
          service:invoice_services(title, status)
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("[technicianService.getById] Error:", error);
      throw new Error(`Gagal mengambil data teknisi: ${error.message}`);
    }

    return {
      ...data,
      active_jobs_count: data.active_jobs?.[0]?.count || 0,
    };
  },

  /**
   * Ambil teknisi yang statusnya available
   */
  async getAvailable(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("role", "technician")
      .eq("status", "available")
      .order("name");

    if (error) {
      console.error("[technicianService.getAvailable] Error:", error);
      throw new Error(`Gagal mengambil teknisi tersedia: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Ambil teknisi bebas menggunakan DB function
   */
  async getFreeTechnicians() {
    const { data, error } = await supabase.rpc("get_free_technicians");

    if (error) {
      console.error("[technicianService.getFreeTechnicians] Error:", error);
      throw new Error(`Gagal mengambil teknisi bebas: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Ambil teknisi bebas berdasarkan skill yang dibutuhkan
   */
  async getFreeTechniciansBySkill(skills: string[]) {
    const { data, error } = await supabase.rpc("get_free_technician_by_skill", {
      required_skills: skills,
    });

    if (error) {
      console.error(
        "[technicianService.getFreeTechniciansBySkill] Error:",
        error,
      );
      throw new Error(`Gagal mengambil teknisi: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Update data employee (nama, telepon, level, dll)
   */
  async update(id: string, updates: UpdateEmployeeInput): Promise<Employee> {
    const { data, error } = await supabase
      .from("employees")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[technicianService.update] Error:", error);
      throw new Error(`Gagal update teknisi: ${error.message}`);
    }

    return data;
  },

  /**
   * Update status ketersediaan teknisi
   */
  async updateStatus(
    id: string,
    status: Employee["status"],
  ): Promise<Employee> {
    return this.update(id, { status });
  },

  /**
   * Update lokasi teknisi di tabel technician_locations (upsert)
   */
  async updateLocation(
    technicianId: string,
    latitude: number,
    longitude: number,
    accuracy?: number,
  ): Promise<TechnicianLocation> {
    const { data, error } = await supabase
      .from("technician_locations")
      .upsert(
        {
          technician_id: technicianId,
          latitude,
          longitude,
          accuracy: accuracy ?? null,
          is_active: true,
          recorded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "technician_id" },
      )
      .select()
      .single();

    if (error) {
      console.error("[technicianService.updateLocation] Error:", error);
      throw new Error(`Gagal update lokasi: ${error.message}`);
    }

    return data;
  },

  /**
   * Ambil lokasi terakhir teknisi
   */
  async getLocation(technicianId: string): Promise<TechnicianLocation | null> {
    const { data, error } = await supabase
      .from("technician_locations")
      .select("*")
      .eq("technician_id", technicianId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      console.error("[technicianService.getLocation] Error:", error);
      throw new Error(`Gagal ambil lokasi: ${error.message}`);
    }

    return data;
  },

  /**
   * Cek apakah teknisi bisa di-assign ke invoice tertentu
   */
  async canBeAssigned(
    invoiceId: string,
    technicianId: string,
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc("can_technician_be_assigned", {
      p_invoice_id: invoiceId,
      p_technician_id: technicianId,
    });

    if (error) {
      console.error("[technicianService.canBeAssigned] Error:", error);
      return false;
    }

    return data ?? false;
  },

  /**
   * Cari teknisi dengan filter
   */
  async search(filters: EmployeeFilters): Promise<EmployeeWithStats[]> {
    let query = supabase
      .from("employees")
      .select(`*, active_jobs:invoice_services!assigned_technician_id(count)`)
      .eq("role", "technician");

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`,
      );
    }

    query = query.order("name");

    const { data, error } = await query;

    if (error) {
      console.error("[technicianService.search] Error:", error);
      throw new Error(`Gagal mencari teknisi: ${error.message}`);
    }

    return (data || []).map((t) => ({
      ...t,
      active_jobs_count: t.active_jobs?.[0]?.count || 0,
    }));
  },
};

// ============================================
// ASSIGNMENT SERVICE
// Operasi untuk tabel service_technician_assignments
// ============================================

export const assignmentService = {
  /**
   * Ambil semua assignment dengan detail lengkap
   */
  async getAll(): Promise<AssignmentWithDetails[]> {
    const { data, error } = await supabase
      .from("service_technician_assignments")
      .select(
        `
        *,
        technician:employees!technician_id(
          id, name, email, phone, avatar_url, status, rating, technician_level
        ),
        invoice:invoices(
          id, invoice_number, status, payment_status,
          customer:customers(name, phone)
        ),
        service:invoice_services(
          id, title, status, priority, service_address,
          scheduled_date, description
        )
      `,
      )
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("[assignmentService.getAll] Error:", error);
      throw new Error(`Gagal mengambil data assignment: ${error.message}`);
    }

    return data || [];
  },

  async getStats() {
    const statuses = ["pending", "assigned", "in_progress", "completed"];

    const results = await Promise.all(
      statuses.map((status) =>
        supabase
          .from("invoice_services")
          .select("*", { count: "exact", head: true })
          .eq("status", status),
      ),
    );

    return {
      pending: results[0].count || 0,
      assigned: results[1].count || 0,
      in_progress: results[2].count || 0,
      completed: results[3].count || 0,
    };
  },

  /**
   * Ambil assignment berdasarkan ID
   */
  async getById(id: string): Promise<AssignmentWithDetails> {
    const { data, error } = await supabase
      .from("service_technician_assignments")
      .select(
        `
        *,
        technician:employees!technician_id(*),
        invoice:invoices(*, customer:customers(name, phone, address)),
        service:invoice_services(*)
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("[assignmentService.getById] Error:", error);
      throw new Error(`Gagal mengambil assignment: ${error.message}`);
    }

    return data;
  },

  /**
   * Ambil semua assignment dari satu teknisi
   */
  async getByTechnician(
    technicianId: string,
  ): Promise<AssignmentWithDetails[]> {
    const { data, error } = await supabase
      .from("service_technician_assignments")
      .select(
        `
        *,
        invoice:invoices(id, invoice_number, status),
        service:invoice_services(id, title, status, priority, service_address, scheduled_date, description)
      `,
      )
      .eq("technician_id", technicianId)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("[assignmentService.getByTechnician] Error:", error);
      throw new Error(`Gagal mengambil assignment teknisi: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Ambil assignment aktif dari satu teknisi
   */
  async getActiveByTechnician(
    technicianId: string,
  ): Promise<AssignmentWithDetails[]> {
    const { data, error } = await supabase
      .from("service_technician_assignments")
      .select(
        `
        *,
        invoice:invoices(id, invoice_number, status),
        service:invoice_services(*)
      `,
      )
      .eq("technician_id", technicianId)
      .in("status", ["assigned", "in_progress"])
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("[assignmentService.getActiveByTechnician] Error:", error);
      throw new Error(`Gagal mengambil assignment aktif: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Ambil teknisi yang ditugaskan ke invoice tertentu
   */
  async getByInvoice(invoiceId: string) {
    const { data, error } = await supabase.rpc("get_invoice_technicians", {
      p_invoice_id: invoiceId,
    });

    if (error) {
      console.error("[assignmentService.getByInvoice] Error:", error);
      throw new Error(`Gagal mengambil teknisi invoice: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Buat assignment baru (assign teknisi ke service)
   */
  async create(input: CreateAssignmentInput): Promise<ServiceAssignment> {
    const { data, error } = await supabase
      .from("service_technician_assignments")
      .insert({
        invoice_id: input.invoice_id,
        technician_id: input.technician_id,
        service_id: input.service_id ?? null,
        role: input.role ?? "technician",
        notes: input.notes ?? null,
        status: "assigned",
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[assignmentService.create] Error:", error);
      throw new Error(`Gagal membuat assignment: ${error.message}`);
    }

    return data;
  },

  /**
   * Update assignment
   */
  async update(
    id: string,
    updates: UpdateAssignmentInput,
  ): Promise<ServiceAssignment> {
    const { data, error } = await supabase
      .from("service_technician_assignments")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[assignmentService.update] Error:", error);
      throw new Error(`Gagal update assignment: ${error.message}`);
    }

    return data;
  },

  /**
   * Hapus assignment
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("service_technician_assignments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[assignmentService.delete] Error:", error);
      throw new Error(`Gagal hapus assignment: ${error.message}`);
    }
  },

  /**
   * Cari assignment dengan filter
   */
  async search(filters: AssignmentFilters): Promise<AssignmentWithDetails[]> {
    let query = supabase.from("service_technician_assignments").select(`
        *,
        technician:employees!technician_id(id, name, email, phone, avatar_url, status, rating, technician_level),
        invoice:invoices(id, invoice_number, status),
        service:invoice_services(id, title, status, priority, service_address, scheduled_date, description)
      `);

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters.technician_id) {
      query = query.eq("technician_id", filters.technician_id);
    }

    if (filters.invoice_id) {
      query = query.eq("invoice_id", filters.invoice_id);
    }

    if (filters.service_id) {
      query = query.eq("service_id", filters.service_id);
    }

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
      throw new Error(`Gagal mencari assignment: ${error.message}`);
    }

    return data || [];
  },
};

// ============================================
// LOCATION SERVICE
// Operasi untuk tabel technician_locations
// ============================================

export const locationService = {
  /**
   * Simpan/update lokasi teknisi (upsert berdasarkan technician_id)
   */
  async upsert(
    technicianId: string,
    latitude: number,
    longitude: number,
    accuracy?: number,
  ): Promise<TechnicianLocation> {
    return technicianService.updateLocation(
      technicianId,
      latitude,
      longitude,
      accuracy,
    );
  },

  /**
   * Ambil lokasi terakhir semua teknisi yang aktif
   */
  async getAllActive(): Promise<TechnicianLocation[]> {
    const { data, error } = await supabase
      .from("technician_locations")
      .select(
        `
        *,
        technician:employees!technician_id(id, name, phone, status, avatar_url)
      `,
      )
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[locationService.getAllActive] Error:", error);
      throw new Error(`Gagal mengambil lokasi aktif: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Nonaktifkan tracking lokasi teknisi
   */
  async deactivate(technicianId: string): Promise<void> {
    const { error } = await supabase
      .from("technician_locations")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("technician_id", technicianId);

    if (error) {
      console.error("[locationService.deactivate] Error:", error);
      throw new Error(`Gagal nonaktifkan tracking: ${error.message}`);
    }
  },
};

// ============================================
// PHOTO SERVICE
// Foto disimpan di kolom before_photos / after_photos
// di tabel invoice_services (array of URL string)
// ============================================

export const photoService = {
  /**
   * Upload foto ke Supabase Storage
   * Return public URL
   */
  async upload(
    serviceId: string,
    file: File,
    photoType: "before" | "after",
  ): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${serviceId}/${photoType}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("service-photos")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      console.error("[photoService.upload] Error:", uploadError);
      throw new Error(`Gagal upload foto: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("service-photos").getPublicUrl(fileName);

    return publicUrl;
  },

  /**
   * Tambahkan URL foto ke kolom before_photos atau after_photos
   * di tabel invoice_services
   */
  async addToService(
    serviceId: string,
    photoUrl: string,
    photoType: "before" | "after",
  ): Promise<void> {
    const column = photoType === "before" ? "before_photos" : "after_photos";

    // Ambil data foto saat ini
    const { data: current, error: fetchError } = await supabase
      .from("invoice_services")
      .select(column)
      .eq("id", serviceId)
      .single();

    if (fetchError) {
      throw new Error(`Gagal mengambil data service: ${fetchError.message}`);
    }

    const existingPhotos: string[] = (current as any)[column] || [];
    const updatedPhotos = [...existingPhotos, photoUrl];

    const { error: updateError } = await supabase
      .from("invoice_services")
      .update({ [column]: updatedPhotos })
      .eq("id", serviceId);

    if (updateError) {
      throw new Error(`Gagal menyimpan foto: ${updateError.message}`);
    }
  },

  /**
   * Upload dan langsung simpan ke service (gabungan upload + addToService)
   */
  async uploadAndSave(
    serviceId: string,
    file: File,
    photoType: "before" | "after",
  ): Promise<string> {
    const url = await this.upload(serviceId, file, photoType);
    await this.addToService(serviceId, url, photoType);
    return url;
  },

  /**
   * Ambil semua foto dari service
   */
  async getByService(serviceId: string): Promise<{
    before_photos: string[];
    after_photos: string[];
  }> {
    const { data, error } = await supabase
      .from("invoice_services")
      .select("before_photos, after_photos")
      .eq("id", serviceId)
      .single();

    if (error) {
      throw new Error(`Gagal mengambil foto: ${error.message}`);
    }

    return {
      before_photos: data.before_photos || [],
      after_photos: data.after_photos || [],
    };
  },

  /**
   * Hapus URL foto dari kolom dan storage
   */
  async delete(
    serviceId: string,
    photoUrl: string,
    photoType: "before" | "after",
  ): Promise<void> {
    const column = photoType === "before" ? "before_photos" : "after_photos";

    const { data: current, error: fetchError } = await supabase
      .from("invoice_services")
      .select(column)
      .eq("id", serviceId)
      .single();

    if (fetchError)
      throw new Error(`Gagal mengambil data: ${fetchError.message}`);

    const existingPhotos: string[] = (current as any)[column] || [];
    const updatedPhotos = existingPhotos.filter((url) => url !== photoUrl);

    const { error: updateError } = await supabase
      .from("invoice_services")
      .update({ [column]: updatedPhotos })
      .eq("id", serviceId);

    if (updateError)
      throw new Error(`Gagal hapus foto: ${updateError.message}`);

    // Hapus dari storage
    const urlParts = photoUrl.split("/");
    const filePath = urlParts.slice(-2).join("/");
    await supabase.storage.from("service-photos").remove([filePath]);
  },
};

// ============================================
// GPS UTILITIES
// ============================================

export const gpsUtils = {
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

  watchPosition(
    onSuccess: (position: GeolocationPosition) => void,
    onError?: (error: GeolocationPositionError) => void,
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

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  formatCoordinates(lat: number, lng: number): string {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  },

  getGoogleMapsUrl(lat: number, lng: number): string {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  },
};

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  technicianService,
  assignmentService,
  locationService,
  photoService,
  gpsUtils,
};
