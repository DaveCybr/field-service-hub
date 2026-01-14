export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      customer_users: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_users_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          blacklisted: boolean | null
          category: Database["public"]["Enums"]["customer_category"]
          created_at: string
          current_outstanding: number | null
          email: string | null
          id: string
          name: string
          notes: string | null
          payment_terms_days: number | null
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          blacklisted?: boolean | null
          category?: Database["public"]["Enums"]["customer_category"]
          created_at?: string
          current_outstanding?: number | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_terms_days?: number | null
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          blacklisted?: boolean | null
          category?: Database["public"]["Enums"]["customer_category"]
          created_at?: string
          current_outstanding?: number | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          rating: number | null
          role: Database["public"]["Enums"]["employee_role"]
          status: Database["public"]["Enums"]["employee_status"]
          total_jobs_completed: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          rating?: number | null
          role?: Database["public"]["Enums"]["employee_role"]
          status?: Database["public"]["Enums"]["employee_status"]
          total_jobs_completed?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          rating?: number | null
          role?: Database["public"]["Enums"]["employee_role"]
          status?: Database["public"]["Enums"]["employee_status"]
          total_jobs_completed?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          stock_after: number
          stock_before: number
          transaction_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          stock_after: number
          stock_before: number
          transaction_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          stock_after?: number
          stock_before?: number
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: Database["public"]["Enums"]["product_category"]
          cost_price: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_service_item: boolean | null
          min_stock_threshold: number
          name: string
          sell_price: number
          sku: string
          stock: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["product_category"]
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_service_item?: boolean | null
          min_stock_threshold?: number
          name: string
          sell_price?: number
          sku: string
          stock?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"]
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_service_item?: boolean | null
          min_stock_threshold?: number
          name?: string
          sell_price?: number
          sku?: string
          stock?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_jobs: {
        Row: {
          actual_checkin_at: string | null
          actual_checkout_at: string | null
          actual_duration_minutes: number | null
          admin_notes: string | null
          after_photos: string[] | null
          assigned_technician_id: string | null
          before_photos: string[] | null
          checkin_gps_valid: boolean | null
          checkout_gps_valid: boolean | null
          checkout_without_payment_approved: boolean | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          estimated_duration_minutes: number | null
          flagged: boolean | null
          gps_violation_detected: boolean | null
          id: string
          job_number: string
          parts_cost: number | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          priority: Database["public"]["Enums"]["job_priority"]
          required_skills: string[] | null
          scheduled_date: string | null
          service_address: string | null
          service_cost: number | null
          service_latitude: number | null
          service_longitude: number | null
          status: Database["public"]["Enums"]["job_status"]
          technician_notes: string | null
          title: string
          total_cost: number | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          actual_checkin_at?: string | null
          actual_checkout_at?: string | null
          actual_duration_minutes?: number | null
          admin_notes?: string | null
          after_photos?: string[] | null
          assigned_technician_id?: string | null
          before_photos?: string[] | null
          checkin_gps_valid?: boolean | null
          checkout_gps_valid?: boolean | null
          checkout_without_payment_approved?: boolean | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          estimated_duration_minutes?: number | null
          flagged?: boolean | null
          gps_violation_detected?: boolean | null
          id?: string
          job_number: string
          parts_cost?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          priority?: Database["public"]["Enums"]["job_priority"]
          required_skills?: string[] | null
          scheduled_date?: string | null
          service_address?: string | null
          service_cost?: number | null
          service_latitude?: number | null
          service_longitude?: number | null
          status?: Database["public"]["Enums"]["job_status"]
          technician_notes?: string | null
          title: string
          total_cost?: number | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_checkin_at?: string | null
          actual_checkout_at?: string | null
          actual_duration_minutes?: number | null
          admin_notes?: string | null
          after_photos?: string[] | null
          assigned_technician_id?: string | null
          before_photos?: string[] | null
          checkin_gps_valid?: boolean | null
          checkout_gps_valid?: boolean | null
          checkout_without_payment_approved?: boolean | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          estimated_duration_minutes?: number | null
          flagged?: boolean | null
          gps_violation_detected?: boolean | null
          id?: string
          job_number?: string
          parts_cost?: number | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          priority?: Database["public"]["Enums"]["job_priority"]
          required_skills?: string[] | null
          scheduled_date?: string | null
          service_address?: string | null
          service_cost?: number | null
          service_latitude?: number | null
          service_longitude?: number | null
          status?: Database["public"]["Enums"]["job_status"]
          technician_notes?: string | null
          title?: string
          total_cost?: number | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_jobs_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_jobs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          current_stock: number
          id: string
          product_id: string
          status: string
          threshold: number
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          current_stock: number
          id?: string
          product_id: string
          status?: string
          threshold: number
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          current_stock?: number
          id?: string
          product_id?: string
          status?: string
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          start_time: string
          technician_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
          technician_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
          technician_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_availability_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_skills: {
        Row: {
          created_at: string
          id: string
          proficiency_level: string | null
          skill_name: string
          technician_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proficiency_level?: string | null
          skill_name: string
          technician_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proficiency_level?: string | null
          skill_name?: string
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_skills_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_time_off: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string | null
          start_date: string
          technician_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          technician_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          technician_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_time_off_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          brand: string | null
          capacity: string | null
          created_at: string
          customer_id: string
          id: string
          last_service_date: string | null
          model: string | null
          notes: string | null
          purchase_date: string | null
          qr_code: string
          serial_number: string | null
          total_services: number | null
          unit_type: string
          updated_at: string
          warranty_expiry_date: string | null
        }
        Insert: {
          brand?: string | null
          capacity?: string | null
          created_at?: string
          customer_id: string
          id?: string
          last_service_date?: string | null
          model?: string | null
          notes?: string | null
          purchase_date?: string | null
          qr_code: string
          serial_number?: string | null
          total_services?: number | null
          unit_type: string
          updated_at?: string
          warranty_expiry_date?: string | null
        }
        Update: {
          brand?: string | null
          capacity?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          last_service_date?: string | null
          model?: string | null
          notes?: string | null
          purchase_date?: string | null
          qr_code?: string
          serial_number?: string | null
          total_services?: number | null
          unit_type?: string
          updated_at?: string
          warranty_expiry_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["employee_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["employee_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["employee_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_job_number: { Args: never; Returns: string }
      generate_sku: { Args: { category_prefix: string }; Returns: string }
      get_employee_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["employee_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["employee_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      customer_category: "retail" | "project"
      employee_role:
        | "admin"
        | "manager"
        | "technician"
        | "cashier"
        | "superadmin"
      employee_status: "available" | "on_job" | "locked" | "off_duty"
      job_priority: "low" | "normal" | "high" | "urgent"
      job_status:
        | "pending_assignment"
        | "pending_approval"
        | "approved"
        | "in_progress"
        | "completed"
        | "completed_paid"
        | "cancelled"
      payment_status: "pending" | "paid" | "partial" | "overdue"
      product_category:
        | "spare_parts"
        | "consumables"
        | "equipment"
        | "accessories"
        | "service_labor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      customer_category: ["retail", "project"],
      employee_role: [
        "admin",
        "manager",
        "technician",
        "cashier",
        "superadmin",
      ],
      employee_status: ["available", "on_job", "locked", "off_duty"],
      job_priority: ["low", "normal", "high", "urgent"],
      job_status: [
        "pending_assignment",
        "pending_approval",
        "approved",
        "in_progress",
        "completed",
        "completed_paid",
        "cancelled",
      ],
      payment_status: ["pending", "paid", "partial", "overdue"],
      product_category: [
        "spare_parts",
        "consumables",
        "equipment",
        "accessories",
        "service_labor",
      ],
    },
  },
} as const
