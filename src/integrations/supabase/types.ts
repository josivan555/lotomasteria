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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bolao_participantes: {
        Row: {
          bolao_id: string
          celular: string
          codigo_referencia: string
          created_at: string | null
          expires_at: string | null
          id: string
          nome_completo: string
          payment_id: string | null
          payment_method: string | null
          pix_data: Json | null
          quantidade_cotas: number
          status: string
          user_id: string | null
          valor_total: number
        }
        Insert: {
          bolao_id: string
          celular: string
          codigo_referencia: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          nome_completo: string
          payment_id?: string | null
          payment_method?: string | null
          pix_data?: Json | null
          quantidade_cotas: number
          status?: string
          user_id?: string | null
          valor_total: number
        }
        Update: {
          bolao_id?: string
          celular?: string
          codigo_referencia?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          nome_completo?: string
          payment_id?: string | null
          payment_method?: string | null
          pix_data?: Json | null
          quantidade_cotas?: number
          status?: string
          user_id?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "bolao_participantes_bolao_id_fkey"
            columns: ["bolao_id"]
            isOneToOne: false
            referencedRelation: "boloes"
            referencedColumns: ["id"]
          },
        ]
      }
      boloes: {
        Row: {
          combo_loterias: Json
          concurso_numero: number
          created_at: string | null
          criador_id: string
          data_sorteio: string
          game_snapshot: Json
          horario_encerramento: string | null
          horario_sorteio: string
          id: string
          is_combo: boolean
          loteria_id: string
          nome: string
          prazo_vendas: string
          premio_estimado: number | null
          resultado_oficial: number[] | null
          status: string
          total_cotas: number
          total_jogos: number
          valor_cota: number
          valor_total: number
        }
        Insert: {
          combo_loterias?: Json
          concurso_numero: number
          created_at?: string | null
          criador_id: string
          data_sorteio: string
          game_snapshot: Json
          horario_encerramento?: string | null
          horario_sorteio: string
          id?: string
          is_combo?: boolean
          loteria_id: string
          nome: string
          prazo_vendas: string
          premio_estimado?: number | null
          resultado_oficial?: number[] | null
          status?: string
          total_cotas: number
          total_jogos: number
          valor_cota: number
          valor_total: number
        }
        Update: {
          combo_loterias?: Json
          concurso_numero?: number
          created_at?: string | null
          criador_id?: string
          data_sorteio?: string
          game_snapshot?: Json
          horario_encerramento?: string | null
          horario_sorteio?: string
          id?: string
          is_combo?: boolean
          loteria_id?: string
          nome?: string
          prazo_vendas?: string
          premio_estimado?: number | null
          resultado_oficial?: number[] | null
          status?: string
          total_cotas?: number
          total_jogos?: number
          valor_cota?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "boloes_loteria_id_fkey"
            columns: ["loteria_id"]
            isOneToOne: false
            referencedRelation: "loterias"
            referencedColumns: ["id"]
          },
        ]
      }
      concursos: {
        Row: {
          created_at: string
          data_apuracao: string
          dezenas: number[]
          especial: boolean | null
          loteria: string
          mes_sorte: number | null
          numero: number
          soma: number
          time_coracao: string | null
        }
        Insert: {
          created_at?: string
          data_apuracao: string
          dezenas: number[]
          especial?: boolean | null
          loteria?: string
          mes_sorte?: number | null
          numero: number
          soma: number
          time_coracao?: string | null
        }
        Update: {
          created_at?: string
          data_apuracao?: string
          dezenas?: number[]
          especial?: boolean | null
          loteria?: string
          mes_sorte?: number | null
          numero?: number
          soma?: number
          time_coracao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "concursos_loteria_fkey"
            columns: ["loteria"]
            isOneToOne: false
            referencedRelation: "loterias"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_orders: {
        Row: {
          amount_brl: number
          created_at: string
          credits: number
          id: string
          init_point: string | null
          package_id: string
          payment_id: string | null
          preference_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_brl: number
          created_at?: string
          credits: number
          id?: string
          init_point?: string | null
          package_id: string
          payment_id?: string | null
          preference_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_brl?: number
          created_at?: string
          credits?: number
          id?: string
          init_point?: string | null
          package_id?: string
          payment_id?: string | null
          preference_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          kind: string
          order_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          order_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          order_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      jogos_salvos: {
        Row: {
          concurso_alvo: number | null
          created_at: string
          dezenas: number[]
          id: string
          loteria: string
          metadata: Json | null
          nome: string | null
          score: number | null
          user_id: string
        }
        Insert: {
          concurso_alvo?: number | null
          created_at?: string
          dezenas: number[]
          id?: string
          loteria?: string
          metadata?: Json | null
          nome?: string | null
          score?: number | null
          user_id: string
        }
        Update: {
          concurso_alvo?: number | null
          created_at?: string
          dezenas?: number[]
          id?: string
          loteria?: string
          metadata?: Json | null
          nome?: string | null
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jogos_salvos_loteria_fkey"
            columns: ["loteria"]
            isOneToOne: false
            referencedRelation: "loterias"
            referencedColumns: ["id"]
          },
        ]
      }
      loterias: {
        Row: {
          cor_tema: string
          created_at: string
          id: string
          nome: string
          ordem: number
          tamanho_jogo: number
          total_numeros: number
        }
        Insert: {
          cor_tema: string
          created_at?: string
          id: string
          nome: string
          ordem?: number
          tamanho_jogo: number
          total_numeros: number
        }
        Update: {
          cor_tema?: string
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          tamanho_jogo?: number
          total_numeros?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          balance: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      apply_paid_order: {
        Args: { _order_id: string; _payment_id: string }
        Returns: boolean
      }
      consume_credits: {
        Args: { _amount: number; _description: string; _user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
