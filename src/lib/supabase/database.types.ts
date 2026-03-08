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
      klienti: {
        Row: {
          adresa: string
          created_at: string
          deleted_at: string | null
          dic: string | null
          dph_sazba: number
          email: string | null
          ico: string | null
          id: string
          individualni_sleva_procent: number
          jmeno: string
          nazev: string
          platba_predem: boolean
          poznamka: string | null
          prijmeni: string
          telefon: string | null
          typ: Database["public"]["Enums"]["typ_klienta"]
          updated_at: string
        }
        Insert: {
          adresa?: string
          created_at?: string
          deleted_at?: string | null
          dic?: string | null
          dph_sazba?: number
          email?: string | null
          ico?: string | null
          id?: string
          individualni_sleva_procent?: number
          jmeno?: string
          nazev?: string
          platba_predem?: boolean
          poznamka?: string | null
          prijmeni?: string
          telefon?: string | null
          typ?: Database["public"]["Enums"]["typ_klienta"]
          updated_at?: string
        }
        Update: {
          adresa?: string
          created_at?: string
          deleted_at?: string | null
          dic?: string | null
          dph_sazba?: number
          email?: string | null
          ico?: string | null
          id?: string
          individualni_sleva_procent?: number
          jmeno?: string
          nazev?: string
          platba_predem?: boolean
          poznamka?: string | null
          prijmeni?: string
          telefon?: string | null
          typ?: Database["public"]["Enums"]["typ_klienta"]
          updated_at?: string
        }
        Relationships: []
      }
      kontaktni_osoby: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string | null
          funkce: string | null
          id: string
          je_primarni: boolean
          jmeno: string
          klient_id: string
          poznamka: string | null
          telefon: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          funkce?: string | null
          id?: string
          je_primarni?: boolean
          jmeno?: string
          klient_id: string
          poznamka?: string | null
          telefon?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          funkce?: string | null
          id?: string
          je_primarni?: boolean
          jmeno?: string
          klient_id?: string
          poznamka?: string | null
          telefon?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kontaktni_osoby_klient_id_fkey"
            columns: ["klient_id"]
            isOneToOne: false
            referencedRelation: "klienti"
            referencedColumns: ["id"]
          },
        ]
      }
      objekty: {
        Row: {
          adresa: string
          created_at: string
          deleted_at: string | null
          id: string
          klient_id: string
          nazev: string
          planek_url: string | null
          plocha_m2: number | null
          poznamka: string | null
          typ_objektu: Database["public"]["Enums"]["typ_objektu"]
          updated_at: string
        }
        Insert: {
          adresa?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          klient_id: string
          nazev?: string
          planek_url?: string | null
          plocha_m2?: number | null
          poznamka?: string | null
          typ_objektu?: Database["public"]["Enums"]["typ_objektu"]
          updated_at?: string
        }
        Update: {
          adresa?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          klient_id?: string
          nazev?: string
          planek_url?: string | null
          plocha_m2?: number | null
          poznamka?: string | null
          typ_objektu?: Database["public"]["Enums"]["typ_objektu"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "objekty_klient_id_fkey"
            columns: ["klient_id"]
            isOneToOne: false
            referencedRelation: "klienti"
            referencedColumns: ["id"]
          },
        ]
      }
      okruhy: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          nazev: string
          objekt_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          nazev?: string
          objekt_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          nazev?: string
          objekt_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "okruhy_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekty"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          aktivni_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          jmeno: string
          koeficient_rychlosti: number
          prijmeni: string
          role: Database["public"]["Enums"]["app_role"][]
          telefon: string | null
          updated_at: string
        }
        Insert: {
          aktivni_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          deleted_at?: string | null
          email: string
          id: string
          jmeno?: string
          koeficient_rychlosti?: number
          prijmeni?: string
          role?: Database["public"]["Enums"]["app_role"][]
          telefon?: string | null
          updated_at?: string
        }
        Update: {
          aktivni_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          jmeno?: string
          koeficient_rychlosti?: number
          prijmeni?: string
          role?: Database["public"]["Enums"]["app_role"][]
          telefon?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sablony_bodu: {
        Row: {
          bod_l_potkan: number
          bod_s_mys: number
          created_at: string
          deleted_at: string | null
          id: string
          letajici: number
          lezouci: number
          rozsah_m2_do: number | null
          rozsah_m2_od: number
          typ_objektu: Database["public"]["Enums"]["typ_objektu"]
          typ_zasahu: Database["public"]["Enums"]["typ_zasahu_kalkulacka"]
          updated_at: string
          vzorec_nad_max: Json | null
          zivolovna: number
        }
        Insert: {
          bod_l_potkan?: number
          bod_s_mys?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          letajici?: number
          lezouci?: number
          rozsah_m2_do?: number | null
          rozsah_m2_od?: number
          typ_objektu: Database["public"]["Enums"]["typ_objektu"]
          typ_zasahu: Database["public"]["Enums"]["typ_zasahu_kalkulacka"]
          updated_at?: string
          vzorec_nad_max?: Json | null
          zivolovna?: number
        }
        Update: {
          bod_l_potkan?: number
          bod_s_mys?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          letajici?: number
          lezouci?: number
          rozsah_m2_do?: number | null
          rozsah_m2_od?: number
          typ_objektu?: Database["public"]["Enums"]["typ_objektu"]
          typ_zasahu?: Database["public"]["Enums"]["typ_zasahu_kalkulacka"]
          updated_at?: string
          vzorec_nad_max?: Json | null
          zivolovna?: number
        }
        Relationships: []
      }
      skudce_pripravky: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          pripravek_nazev: string
          skudce_id: string
          typ_prostoru: Database["public"]["Enums"]["typ_prostoru"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          pripravek_nazev: string
          skudce_id: string
          typ_prostoru: Database["public"]["Enums"]["typ_prostoru"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          pripravek_nazev?: string
          skudce_id?: string
          typ_prostoru?: Database["public"]["Enums"]["typ_prostoru"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skudce_pripravky_skudce_id_fkey"
            columns: ["skudce_id"]
            isOneToOne: false
            referencedRelation: "skudci"
            referencedColumns: ["id"]
          },
        ]
      }
      skudci: {
        Row: {
          created_at: string
          deleted_at: string | null
          doporucena_cetnost_dny: number | null
          id: string
          kategorie: string | null
          latinsky_nazev: string | null
          nazev: string
          pocet_zasahu: string | null
          poznamka: string | null
          typ: Database["public"]["Enums"]["typ_skudce"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          doporucena_cetnost_dny?: number | null
          id?: string
          kategorie?: string | null
          latinsky_nazev?: string | null
          nazev: string
          pocet_zasahu?: string | null
          poznamka?: string | null
          typ: Database["public"]["Enums"]["typ_skudce"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          doporucena_cetnost_dny?: number | null
          id?: string
          kategorie?: string | null
          latinsky_nazev?: string | null
          nazev?: string
          pocet_zasahu?: string | null
          poznamka?: string | null
          typ?: Database["public"]["Enums"]["typ_skudce"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin_or_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "technik" | "klient"
      typ_klienta: "firma" | "fyzicka_osoba"
      typ_objektu:
        | "gastro"
        | "sklad_nevyzivocisna"
        | "sklad_zivocisna"
        | "domacnost"
        | "kancelar"
        | "skola"
        | "hotel"
        | "nemocnice"
        | "ubytovna"
        | "vyrobni_hala"
        | "jiny"
      typ_prostoru:
        | "potravinarsky"
        | "domacnost"
        | "prumysl"
        | "venkovni"
        | "zemedelsky"
        | "chov_zvirat"
      typ_skudce: "hlodavec" | "lezouci_hmyz" | "letajici_hmyz" | "ostatni"
      typ_zasahu_kalkulacka:
        | "vnitrni_deratizace"
        | "vnejsi_deratizace"
        | "vnitrni_dezinsekce"
        | "postrik"
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
      app_role: ["super_admin", "admin", "technik", "klient"],
      typ_klienta: ["firma", "fyzicka_osoba"],
      typ_objektu: [
        "gastro",
        "sklad_nevyzivocisna",
        "sklad_zivocisna",
        "domacnost",
        "kancelar",
        "skola",
        "hotel",
        "nemocnice",
        "ubytovna",
        "vyrobni_hala",
        "jiny",
      ],
      typ_prostoru: [
        "potravinarsky",
        "domacnost",
        "prumysl",
        "venkovni",
        "zemedelsky",
        "chov_zvirat",
      ],
      typ_skudce: ["hlodavec", "lezouci_hmyz", "letajici_hmyz", "ostatni"],
      typ_zasahu_kalkulacka: [
        "vnitrni_deratizace",
        "vnejsi_deratizace",
        "vnitrni_dezinsekce",
        "postrik",
      ],
    },
  },
} as const
