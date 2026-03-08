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
      appointments: {
        Row: {
          amount: number | null
          appointment_date: string
          appointment_time: string
          attendant_id: string | null
          attendant_name: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          patient_id: string | null
          patient_name: string
          revenue_received_at: string | null
          service_id: string | null
          service_name: string | null
          status: string
          type: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          appointment_date: string
          appointment_time: string
          attendant_id?: string | null
          attendant_name?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          patient_name: string
          revenue_received_at?: string | null
          service_id?: string | null
          service_name?: string | null
          status?: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          appointment_date?: string
          appointment_time?: string
          attendant_id?: string | null
          attendant_name?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          patient_name?: string
          revenue_received_at?: string | null
          service_id?: string | null
          service_name?: string | null
          status?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_status_config: {
        Row: {
          id: string
          key: string
          label: string
          is_system: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          label: string
          is_system?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          label?: string
          is_system?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      revenue: {
        Row: {
          id: string
          amount: number
          description: string
          revenue_date: string
          status: string
          patient_id: string | null
          patient_name: string | null
          category_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          amount: number
          description?: string
          revenue_date?: string
          status?: string
          patient_id?: string | null
          patient_name?: string | null
          category_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          amount?: number
          description?: string
          revenue_date?: string
          status?: string
          patient_id?: string | null
          patient_name?: string | null
          category_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      revenue_attachments: {
        Row: {
          id: string
          revenue_id: string
          storage_key: string
          file_url: string
          file_name: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          revenue_id: string
          storage_key: string
          file_url: string
          file_name: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          revenue_id?: string
          storage_key?: string
          file_url?: string
          file_name?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_attachments_revenue_id_fkey"
            columns: ["revenue_id"]
            isOneToOne: false
            referencedRelation: "revenue"
            referencedColumns: ["id"]
          }
        ]
      }
      revenue_status_config: {
        Row: {
          id: string
          key: string
          label: string
          is_system: boolean
          sort_order: number
          count_in_balance: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          label: string
          is_system?: boolean
          sort_order?: number
          count_in_balance?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          label?: string
          is_system?: boolean
          sort_order?: number
          count_in_balance?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          amount: number
          description: string
          expense_date: string
          status: string
          patient_id: string | null
          patient_name: string | null
          category_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          amount: number
          description?: string
          expense_date?: string
          status?: string
          patient_id?: string | null
          patient_name?: string | null
          category_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          amount?: number
          description?: string
          expense_date?: string
          status?: string
          patient_id?: string | null
          patient_name?: string | null
          category_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      expense_attachments: {
        Row: {
          id: string
          expense_id: string
          storage_key: string
          file_url: string
          file_name: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          expense_id: string
          storage_key: string
          file_url: string
          file_name: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          expense_id?: string
          storage_key?: string
          file_url?: string
          file_name?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_attachments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          }
        ]
      }
      expense_status_config: {
        Row: {
          id: string
          key: string
          label: string
          is_system: boolean
          sort_order: number
          count_in_balance: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          label: string
          is_system?: boolean
          sort_order?: number
          count_in_balance?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          label?: string
          is_system?: boolean
          sort_order?: number
          count_in_balance?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_categories: {
        Row: {
          id: string
          name: string
          applies_to: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          applies_to: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          applies_to?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_status_config: {
        Row: {
          id: string
          key: string
          label: string
          is_system: boolean
          sort_order: number
          count_in_balance: boolean
          applies_to: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          label: string
          is_system?: boolean
          sort_order?: number
          count_in_balance?: boolean
          applies_to: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          label?: string
          is_system?: boolean
          sort_order?: number
          count_in_balance?: boolean
          applies_to?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          id: string
          name: string
          value: number
          sessions: number
          observations: string | null
          due_day: number
          validity_months: number | null
          cycle_start_day: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          value: number
          sessions: number
          observations?: string | null
          due_day?: number
          validity_months?: number | null
          cycle_start_day?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          value?: number
          sessions?: number
          observations?: string | null
          due_day?: number
          validity_months?: number | null
          cycle_start_day?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_plan_history: {
        Row: {
          id: string
          patient_id: string
          plan_id: string | null
          previous_plan_id: string | null
          action: "added" | "changed" | "removed"
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          patient_id: string
          plan_id?: string | null
          previous_plan_id?: string | null
          action: "added" | "changed" | "removed"
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          patient_id?: string
          plan_id?: string | null
          previous_plan_id?: string | null
          action?: "added" | "changed" | "removed"
          created_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      custom_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      customization: {
        Row: {
          allow_registrations: boolean
          app_name: string
          app_subtitle: string | null
          created_at: string
          id: string
          logo_url: string | null
          primary_color: string | null
          sidebar_style: string | null
          updated_at: string
        }
        Insert: {
          allow_registrations?: boolean
          app_name?: string
          app_subtitle?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          sidebar_style?: string | null
          updated_at?: string
        }
        Update: {
          allow_registrations?: boolean
          app_name?: string
          app_subtitle?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          sidebar_style?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      establishments: {
        Row: {
          address_cep: string | null
          address_city: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address_cep?: string | null
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address_cep?: string | null
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      evolution_api_config: {
        Row: {
          id: string
          enabled: boolean
          base_url: string
          token: string
          default_sender_name: string
          default_phone_country_code: string
          last_test_at: string | null
          last_test_result: string | null
          last_test_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enabled?: boolean
          base_url?: string
          token?: string
          default_sender_name?: string
          default_phone_country_code?: string
          last_test_at?: string | null
          last_test_result?: string | null
          last_test_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enabled?: boolean
          base_url?: string
          token?: string
          default_sender_name?: string
          default_phone_country_code?: string
          last_test_at?: string | null
          last_test_result?: string | null
          last_test_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_smtp_config: {
        Row: {
          id: string
          enabled: boolean
          host: string
          port: number
          use_tls: boolean
          username: string
          password: string
          from_name: string
          from_email: string
          backend_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enabled?: boolean
          host?: string
          port?: number
          use_tls?: boolean
          username?: string
          password?: string
          from_name?: string
          from_email?: string
          backend_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enabled?: boolean
          host?: string
          port?: number
          use_tls?: boolean
          username?: string
          password?: string
          from_name?: string
          from_email?: string
          backend_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      minio_storage_config: {
        Row: {
          access_key: string
          base_path: string
          bucket: string
          created_at: string
          enabled: boolean
          endpoint: string
          id: string
          last_test_at: string | null
          last_test_message: string | null
          last_test_result: string | null
          port: number
          region: string
          secret_key: string
          updated_at: string
          use_ssl: boolean
        }
        Insert: {
          access_key?: string
          base_path?: string
          bucket?: string
          created_at?: string
          enabled?: boolean
          endpoint?: string
          id?: string
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_result?: string | null
          port?: number
          region?: string
          secret_key?: string
          updated_at?: string
          use_ssl?: boolean
        }
        Update: {
          access_key?: string
          base_path?: string
          bucket?: string
          created_at?: string
          enabled?: boolean
          endpoint?: string
          id?: string
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_result?: string | null
          port?: number
          region?: string
          secret_key?: string
          updated_at?: string
          use_ssl?: boolean
        }
        Relationships: []
      }
      minio_storage_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          bucket: string | null
          correlation_id: string | null
          created_at: string
          error_message: string | null
          id: string
          message: string | null
          metadata_json: Json
          module: string | null
          prefix: string | null
          status: string
          storage_key: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          bucket?: string | null
          correlation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string | null
          metadata_json?: Json
          module?: string | null
          prefix?: string | null
          status: string
          storage_key?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          bucket?: string | null
          correlation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string | null
          metadata_json?: Json
          module?: string | null
          prefix?: string | null
          status?: string
          storage_key?: string | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          id: string
          name: string
          enabled: boolean
          channels: string[]
          service: string
          recipient_target: string
          event_key: string
          message: string
          media_url: string | null
          timing: string
          hours: number
          sort_order: number
          version: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string
          enabled?: boolean
          channels?: string[]
          service?: string
          recipient_target?: string
          event_key?: string
          message?: string
          media_url?: string | null
          timing?: string
          hours?: number
          sort_order?: number
          version?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          enabled?: boolean
          channels?: string[]
          service?: string
          recipient_target?: string
          event_key?: string
          message?: string
          media_url?: string | null
          timing?: string
          hours?: number
          sort_order?: number
          version?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_settings_history: {
        Row: {
          id: string
          notification_settings_id: string
          version: number
          name: string
          enabled: boolean
          channels: string[]
          service: string
          recipient_target: string
          event_key: string
          message: string
          media_url: string | null
          timing: string
          hours: number
          sort_order: number
          changed_by: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          notification_settings_id: string
          version: number
          name: string
          enabled: boolean
          channels: string[]
          service: string
          recipient_target: string
          event_key: string
          message: string
          media_url?: string | null
          timing: string
          hours: number
          sort_order: number
          changed_by?: string | null
          changed_at?: string
        }
        Update: {
          id?: string
          notification_settings_id?: string
          version?: number
          name?: string
          enabled?: boolean
          channels?: string[]
          service?: string
          recipient_target?: string
          event_key?: string
          message?: string
          media_url?: string | null
          timing?: string
          hours?: number
          sort_order?: number
          changed_by?: string | null
          changed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_history_notification_settings_id_fkey"
            columns: ["notification_settings_id"]
            isOneToOne: false
            referencedRelation: "notification_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_dispatch_logs: {
        Row: {
          id: string
          notification_settings_id: string | null
          service: string
          event_key: string
          channel: string
          recipient: string
          status: string
          error_message: string | null
          dedupe_key: string | null
          payload_json: Json | null
          provider_response_json: Json | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          notification_settings_id?: string | null
          service: string
          event_key: string
          channel: string
          recipient: string
          status: string
          error_message?: string | null
          dedupe_key?: string | null
          payload_json?: Json | null
          provider_response_json?: Json | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          notification_settings_id?: string | null
          service?: string
          event_key?: string
          channel?: string
          recipient?: string
          status?: string
          error_message?: string | null
          dedupe_key?: string | null
          payload_json?: Json | null
          provider_response_json?: Json | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_dispatch_logs_notification_settings_id_fkey"
            columns: ["notification_settings_id"]
            isOneToOne: false
            referencedRelation: "notification_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          created_at: string
          created_by: string | null
          diagnosis: string
          id: string
          next_appointment: string | null
          notes: string | null
          patient_id: string
          sessions: number
          status: Database["public"]["Enums"]["treatment_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          diagnosis: string
          id?: string
          next_appointment?: string | null
          notes?: string | null
          patient_id: string
          sessions?: number
          status?: Database["public"]["Enums"]["treatment_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          diagnosis?: string
          id?: string
          next_appointment?: string | null
          notes?: string | null
          patient_id?: string
          sessions?: number
          status?: Database["public"]["Enums"]["treatment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          document_url: string | null
          document_storage_key: string | null
          email: string | null
          gender: string | null
          id: string
          marital_status: string | null
          name: string
          notes: string | null
          phone: string | null
          photo_url: string | null
          photo_storage_key: string | null
          plan_id: string | null
          profession: string | null
          rg: string | null
          status: Database["public"]["Enums"]["patient_status"]
          updated_at: string
        }
        Insert: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          document_storage_key?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          marital_status?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          photo_storage_key?: string | null
          plan_id?: string | null
          profession?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          updated_at?: string
        }
        Update: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          document_url?: string | null
          document_storage_key?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          marital_status?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          photo_storage_key?: string | null
          plan_id?: string | null
          profession?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["patient_status"]
          updated_at?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          attendant_id: string
          attendant_name: string
          created_at: string
          created_by: string | null
          diagnosis: string | null
          id: string
          medications: Json
          notes: string | null
          patient_id: string
          patient_name: string
          updated_at: string
        }
        Insert: {
          attendant_id: string
          attendant_name: string
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          id?: string
          medications?: Json
          notes?: string | null
          patient_id: string
          patient_name: string
          updated_at?: string
        }
        Update: {
          attendant_id?: string
          attendant_name?: string
          created_at?: string
          created_by?: string | null
          diagnosis?: string | null
          id?: string
          medications?: Json
          notes?: string | null
          patient_id?: string
          patient_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_cep: string | null
          address_complement: string | null
          address_country: string | null
          address_label: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          avatar_url: string | null
          avatar_storage_key: string | null
          bank_account: string | null
          bank_agency: string | null
          bank_holder: string | null
          bank_name: string | null
          birth_date: string | null
          cnpj: string | null
          contract_document: string | null
          contract_document_name: string | null
          contract_document_storage_key: string | null
          contract_status: string
          created_at: string
          cpf: string | null
          education: string | null
          email: string
          gender: string | null
          id: string
          is_active: boolean
          marital_status: string | null
          name: string
          notes: string | null
          pix_key: string | null
          phone: string | null
          position: string | null
          professional_council: string | null
          professional_document: string | null
          professional_document_name: string | null
          professional_document_storage_key: string | null
          rg: string | null
          service_area: string | null
          updated_at: string
          user_id: string
          work_days: string[] | null
        }
        Insert: {
          address_cep?: string | null
          address_complement?: string | null
          address_country?: string | null
          address_label?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          avatar_storage_key?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          bank_holder?: string | null
          bank_name?: string | null
          birth_date?: string | null
          cnpj?: string | null
          contract_document?: string | null
          contract_document_name?: string | null
          contract_document_storage_key?: string | null
          contract_status?: string
          created_at?: string
          cpf?: string | null
          education?: string | null
          email: string
          gender?: string | null
          id?: string
          is_active?: boolean
          marital_status?: string | null
          name: string
          notes?: string | null
          pix_key?: string | null
          phone?: string | null
          position?: string | null
          professional_council?: string | null
          professional_document?: string | null
          professional_document_name?: string | null
          professional_document_storage_key?: string | null
          rg?: string | null
          service_area?: string | null
          updated_at?: string
          user_id: string
          work_days?: string[] | null
        }
        Update: {
          address_cep?: string | null
          address_complement?: string | null
          address_country?: string | null
          address_label?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          avatar_storage_key?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          bank_holder?: string | null
          bank_name?: string | null
          birth_date?: string | null
          cnpj?: string | null
          contract_document?: string | null
          contract_document_name?: string | null
          contract_document_storage_key?: string | null
          contract_status?: string
          created_at?: string
          cpf?: string | null
          education?: string | null
          email?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          marital_status?: string | null
          name?: string
          notes?: string | null
          pix_key?: string | null
          phone?: string | null
          position?: string | null
          professional_council?: string | null
          professional_document?: string | null
          professional_document_name?: string | null
          professional_document_storage_key?: string | null
          rg?: string | null
          service_area?: string | null
          updated_at?: string
          user_id?: string
          work_days?: string[] | null
        }
        Relationships: []
      }
      schedule_assignments: {
        Row: {
          assigned_at: string
          attendant_id: string
          attendant_name: string
          id: string
          time_slot_id: string
        }
        Insert: {
          assigned_at?: string
          attendant_id: string
          attendant_name: string
          id?: string
          time_slot_id: string
        }
        Update: {
          assigned_at?: string
          attendant_id?: string
          attendant_name?: string
          id?: string
          time_slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_assignments_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      service_assignments: {
        Row: {
          assigned_at: string
          attendant_id: string
          attendant_name: string
          id: string
          service_id: string
        }
        Insert: {
          assigned_at?: string
          attendant_id: string
          attendant_name: string
          id?: string
          service_id: string
        }
        Update: {
          assigned_at?: string
          attendant_id?: string
          attendant_name?: string
          id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_assignments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_available: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_available?: boolean
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_available?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      time_slots: {
        Row: {
          created_at: string
          days: string[]
          id: string
          is_available: boolean
          time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days?: string[]
          id?: string
          is_available?: boolean
          time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days?: string[]
          id?: string
          is_available?: boolean
          time?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          menu: string
          menu_group: string
          message: string | null
          metadata_json: Json
          screen: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          menu: string
          menu_group: string
          message?: string | null
          metadata_json?: Json
          screen: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          menu?: string
          menu_group?: string
          message?: string | null
          metadata_json?: Json
          screen?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "user"
      appointment_status: "pending" | "confirmed" | "cancelled" | "completed" | "paid"
      patient_status: "active" | "inactive" | "pending"
      treatment_status: "starting" | "in_treatment" | "completed" | "paused"
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
      app_role: ["admin", "manager", "user"],
      appointment_status: ["pending", "confirmed", "cancelled", "completed", "paid"],
      patient_status: ["active", "inactive", "pending"],
      treatment_status: ["starting", "in_treatment", "completed", "paused"],
    },
  },
} as const
