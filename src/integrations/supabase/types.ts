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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      application_products: {
        Row: {
          application_id: string
          created_at: string
          dose_per_ha: number
          id: string
          product_id: string
          total_amount: number
          total_cost: number
          unit_cost: number
        }
        Insert: {
          application_id: string
          created_at?: string
          dose_per_ha: number
          id?: string
          product_id: string
          total_amount: number
          total_cost: number
          unit_cost: number
        }
        Update: {
          application_id?: string
          created_at?: string
          dose_per_ha?: number
          id?: string
          product_id?: string
          total_amount?: number
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "application_products_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          application_date: string
          application_type: Database["public"]["Enums"]["application_type"]
          area_applied: number
          created_at: string
          flight_time_minutes: number | null
          id: string
          notes: string | null
          plot_name: string | null
          property_id: string
          status: Database["public"]["Enums"]["application_status"]
          total_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          application_date: string
          application_type: Database["public"]["Enums"]["application_type"]
          area_applied: number
          created_at?: string
          flight_time_minutes?: number | null
          id?: string
          notes?: string | null
          plot_name?: string | null
          property_id: string
          status?: Database["public"]["Enums"]["application_status"]
          total_cost: number
          updated_at?: string
          user_id: string
        }
        Update: {
          application_date?: string
          application_type?: Database["public"]["Enums"]["application_type"]
          area_applied?: number
          created_at?: string
          flight_time_minutes?: number | null
          id?: string
          notes?: string | null
          plot_name?: string | null
          property_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          total_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          battery_capacity: number
          created_at: string
          flight_time_minutes: number
          id: string
          model: string
          name: string
          notes: string | null
          status: string
          tank_capacity: number
          total_flight_hours: number
          total_flights: number
          updated_at: string
          user_id: string
        }
        Insert: {
          battery_capacity?: number
          created_at?: string
          flight_time_minutes?: number
          id?: string
          model: string
          name: string
          notes?: string | null
          status?: string
          tank_capacity?: number
          total_flight_hours?: number
          total_flights?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          battery_capacity?: number
          created_at?: string
          flight_time_minutes?: number
          id?: string
          model?: string
          name?: string
          notes?: string | null
          status?: string
          tank_capacity?: number
          total_flight_hours?: number
          total_flights?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      flight_planning: {
        Row: {
          area: number
          battery_time_minutes: number
          created_at: string
          estimated_flights: number | null
          estimated_time_minutes: number | null
          flight_speed: number
          id: string
          name: string
          notes: string | null
          property_id: string | null
          swath_width: number
          updated_at: string
          user_id: string
        }
        Insert: {
          area: number
          battery_time_minutes: number
          created_at?: string
          estimated_flights?: number | null
          estimated_time_minutes?: number | null
          flight_speed: number
          id?: string
          name: string
          notes?: string | null
          property_id?: string | null
          swath_width: number
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: number
          battery_time_minutes?: number
          created_at?: string
          estimated_flights?: number | null
          estimated_time_minutes?: number | null
          flight_speed?: number
          id?: string
          name?: string
          notes?: string | null
          property_id?: string | null
          swath_width?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_planning_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          manufacturer: string | null
          name: string
          recommended_dose: number | null
          recommended_dose_unit: string | null
          stock_quantity: number
          unit: string
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          id?: string
          manufacturer?: string | null
          name: string
          recommended_dose?: number | null
          recommended_dose_unit?: string | null
          stock_quantity?: number
          unit?: string
          unit_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          manufacturer?: string | null
          name?: string
          recommended_dose?: number | null
          recommended_dose_unit?: string | null
          stock_quantity?: number
          unit?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          created_at: string
          id: string
          location: string
          name: string
          notes: string | null
          plot_count: number
          total_area: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location: string
          name: string
          notes?: string | null
          plot_count?: number
          total_area: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string
          name?: string
          notes?: string | null
          plot_count?: number
          total_area?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_products: {
        Row: {
          created_at: string
          dose_per_ha: number
          dose_unit: string
          id: string
          product_id: string
          recipe_id: string
        }
        Insert: {
          created_at?: string
          dose_per_ha: number
          dose_unit?: string
          id?: string
          product_id: string
          recipe_id: string
        }
        Update: {
          created_at?: string
          dose_per_ha?: number
          dose_unit?: string
          id?: string
          product_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_products_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      application_status:
        | "planejada"
        | "em_andamento"
        | "concluída"
        | "cancelada"
      application_type: "pulverização" | "adubação" | "semeadura" | "outro"
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
      application_status: [
        "planejada",
        "em_andamento",
        "concluída",
        "cancelada",
      ],
      application_type: ["pulverização", "adubação", "semeadura", "outro"],
    },
  },
} as const
