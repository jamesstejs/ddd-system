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
      bonusy: {
        Row: {
          id: string
          uzivatel_id: string
          typ: Database["public"]["Enums"]["typ_bonusu"]
          zakazka_id: string | null
          zasah_id: string | null
          castka: number
          obdobi_mesic: string
          stav: Database["public"]["Enums"]["stav_bonusu"]
          poznamka: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          uzivatel_id: string
          typ: Database["public"]["Enums"]["typ_bonusu"]
          zakazka_id?: string | null
          zasah_id?: string | null
          castka?: number
          obdobi_mesic: string
          stav?: Database["public"]["Enums"]["stav_bonusu"]
          poznamka?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          uzivatel_id?: string
          typ?: Database["public"]["Enums"]["typ_bonusu"]
          zakazka_id?: string | null
          zasah_id?: string | null
          castka?: number
          obdobi_mesic?: string
          stav?: Database["public"]["Enums"]["stav_bonusu"]
          poznamka?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bonusy_uzivatel_id_fkey"
            columns: ["uzivatel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonusy_zakazka_id_fkey"
            columns: ["zakazka_id"]
            isOneToOne: false
            referencedRelation: "zakazky"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonusy_zasah_id_fkey"
            columns: ["zasah_id"]
            isOneToOne: false
            referencedRelation: "zasahy"
            referencedColumns: ["id"]
          },
        ]
      }
      nastaveni_bonusu: {
        Row: {
          id: string
          klic: string
          hodnota: number
          popis: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          klic: string
          hodnota: number
          popis?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          klic?: string
          hodnota?: number
          popis?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_log: {
        Row: {
          id: string
          protokol_id: string | null
          zasah_id: string | null
          prijemce: string
          predmet: string
          typ: Database["public"]["Enums"]["typ_emailu"]
          stav: Database["public"]["Enums"]["stav_emailu"]
          resend_id: string | null
          chyba_detail: string | null
          odeslano_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          protokol_id?: string | null
          zasah_id?: string | null
          prijemce: string
          predmet: string
          typ?: Database["public"]["Enums"]["typ_emailu"]
          stav?: Database["public"]["Enums"]["stav_emailu"]
          resend_id?: string | null
          chyba_detail?: string | null
          odeslano_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          protokol_id?: string | null
          zasah_id?: string | null
          prijemce?: string
          predmet?: string
          typ?: Database["public"]["Enums"]["typ_emailu"]
          stav?: Database["public"]["Enums"]["stav_emailu"]
          resend_id?: string | null
          chyba_detail?: string | null
          odeslano_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_log_protokol_id_fkey"
            columns: ["protokol_id"]
            isOneToOne: false
            referencedRelation: "protokoly"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_zasah_id_fkey"
            columns: ["zasah_id"]
            isOneToOne: false
            referencedRelation: "zasahy"
            referencedColumns: ["id"]
          },
        ]
      }
      bezpecnostni_listy: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          nahrano_datum: string
          nazev_souboru: string
          pripravek_id: string
          soubor_url: string
          updated_at: string
          velikost_bytes: number | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          nahrano_datum?: string
          nazev_souboru: string
          pripravek_id: string
          soubor_url: string
          updated_at?: string
          velikost_bytes?: number | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          nahrano_datum?: string
          nazev_souboru?: string
          pripravek_id?: string
          soubor_url?: string
          updated_at?: string
          velikost_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bezpecnostni_listy_pripravek_id_fkey"
            columns: ["pripravek_id"]
            isOneToOne: false
            referencedRelation: "pripravky"
            referencedColumns: ["id"]
          },
        ]
      }
      cenik_deratizace: {
        Row: {
          cena_za_kus: number
          created_at: string
          deleted_at: string | null
          id: string
          nazev: string
          updated_at: string
        }
        Insert: {
          cena_za_kus: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          nazev: string
          updated_at?: string
        }
        Update: {
          cena_za_kus?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          nazev?: string
          updated_at?: string
        }
        Relationships: []
      }
      cenik_dezinfekce: {
        Row: {
          cena_za_m: number
          created_at: string
          deleted_at: string | null
          id: string
          plocha_do: number | null
          plocha_od: number
          typ: string
          updated_at: string
        }
        Insert: {
          cena_za_m: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          plocha_do?: number | null
          plocha_od: number
          typ: string
          updated_at?: string
        }
        Update: {
          cena_za_m?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          plocha_do?: number | null
          plocha_od?: number
          typ?: string
          updated_at?: string
        }
        Relationships: []
      }
      cenik_gely: {
        Row: {
          bytu_do: number | null
          bytu_od: number
          cena: number
          created_at: string
          deleted_at: string | null
          id: string
          kategorie: string
          updated_at: string
        }
        Insert: {
          bytu_do?: number | null
          bytu_od: number
          cena: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          kategorie: string
          updated_at?: string
        }
        Update: {
          bytu_do?: number | null
          bytu_od?: number
          cena?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          kategorie?: string
          updated_at?: string
        }
        Relationships: []
      }
      cenik_obecne: {
        Row: {
          created_at: string
          deleted_at: string | null
          hodnota: number
          id: string
          jednotka: string
          nazev: string
          poznamka: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          hodnota: number
          id?: string
          jednotka: string
          nazev: string
          poznamka?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          hodnota?: number
          id?: string
          jednotka?: string
          nazev?: string
          poznamka?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cenik_postriky: {
        Row: {
          cena: number
          created_at: string
          deleted_at: string | null
          id: string
          kategorie: string
          plocha_do: number | null
          plocha_od: number
          updated_at: string
        }
        Insert: {
          cena: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          kategorie: string
          plocha_do?: number | null
          plocha_od: number
          updated_at?: string
        }
        Update: {
          cena?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          kategorie?: string
          plocha_do?: number | null
          plocha_od?: number
          updated_at?: string
        }
        Relationships: []
      }
      cenik_specialni: {
        Row: {
          cena_do: number | null
          cena_od: number
          created_at: string
          deleted_at: string | null
          id: string
          nazev: string
          updated_at: string
        }
        Insert: {
          cena_do?: number | null
          cena_od: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          nazev: string
          updated_at?: string
        }
        Update: {
          cena_do?: number | null
          cena_od?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          nazev?: string
          updated_at?: string
        }
        Relationships: []
      }
      dostupnost: {
        Row: {
          cas_do: string
          cas_od: string
          created_at: string
          datum: string
          deleted_at: string | null
          id: string
          poznamka: string | null
          technik_id: string
          updated_at: string
        }
        Insert: {
          cas_do: string
          cas_od: string
          created_at?: string
          datum: string
          deleted_at?: string | null
          id?: string
          poznamka?: string | null
          technik_id: string
          updated_at?: string
        }
        Update: {
          cas_do?: string
          cas_od?: string
          created_at?: string
          datum?: string
          deleted_at?: string | null
          id?: string
          poznamka?: string | null
          technik_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dostupnost_technik_id_fkey"
            columns: ["technik_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      faktury: {
        Row: {
          id: string
          zakazka_id: string | null
          protokol_id: string | null
          fakturoid_id: number | null
          cislo: string | null
          castka_bez_dph: number | null
          castka_s_dph: number | null
          dph_sazba: number
          splatnost_dnu: number
          datum_vystaveni: string
          datum_splatnosti: string | null
          stav: Database["public"]["Enums"]["stav_faktury"]
          fakturoid_url: string | null
          fakturoid_pdf_url: string | null
          poznamka: string | null
          is_proforma: boolean
          proforma_public_url: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          zakazka_id?: string | null
          protokol_id?: string | null
          fakturoid_id?: number | null
          cislo?: string | null
          castka_bez_dph?: number | null
          castka_s_dph?: number | null
          dph_sazba?: number
          splatnost_dnu?: number
          datum_vystaveni?: string
          datum_splatnosti?: string | null
          stav?: Database["public"]["Enums"]["stav_faktury"]
          fakturoid_url?: string | null
          fakturoid_pdf_url?: string | null
          poznamka?: string | null
          is_proforma?: boolean
          proforma_public_url?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          zakazka_id?: string | null
          protokol_id?: string | null
          fakturoid_id?: number | null
          cislo?: string | null
          castka_bez_dph?: number | null
          castka_s_dph?: number | null
          dph_sazba?: number
          splatnost_dnu?: number
          datum_vystaveni?: string
          datum_splatnosti?: string | null
          stav?: Database["public"]["Enums"]["stav_faktury"]
          fakturoid_url?: string | null
          fakturoid_pdf_url?: string | null
          poznamka?: string | null
          is_proforma?: boolean
          proforma_public_url?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faktury_zakazka_id_fkey"
            columns: ["zakazka_id"]
            isOneToOne: false
            referencedRelation: "zakazky"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faktury_protokol_id_fkey"
            columns: ["protokol_id"]
            isOneToOne: false
            referencedRelation: "protokoly"
            referencedColumns: ["id"]
          },
        ]
      }
      klienti: {
        Row: {
          adresa: string
          created_at: string
          deleted_at: string | null
          dic: string | null
          dph_sazba: number
          email: string | null
          fakturoid_subject_id: number | null
          ico: string | null
          id: string
          individualni_sleva_procent: number
          jmeno: string
          kod: string
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
          fakturoid_subject_id?: number | null
          ico?: string | null
          id?: string
          individualni_sleva_procent?: number
          jmeno?: string
          kod?: string
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
          fakturoid_subject_id?: number | null
          ico?: string | null
          id?: string
          individualni_sleva_procent?: number
          jmeno?: string
          kod?: string
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
          lat: number | null
          lng: number | null
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
          lat?: number | null
          lng?: number | null
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
          lat?: number | null
          lng?: number | null
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
      pripominky_terminu: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          max_upozorneni: number
          pocet_upozorneni: number
          posledni_upozorneni_at: string | null
          stav: Database["public"]["Enums"]["stav_pripominky"]
          technik_id: string
          typ: Database["public"]["Enums"]["typ_pripominky"]
          updated_at: string
          zakazka_id: string
          zasah_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          max_upozorneni?: number
          pocet_upozorneni?: number
          posledni_upozorneni_at?: string | null
          stav?: Database["public"]["Enums"]["stav_pripominky"]
          technik_id: string
          typ?: Database["public"]["Enums"]["typ_pripominky"]
          updated_at?: string
          zakazka_id: string
          zasah_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          max_upozorneni?: number
          pocet_upozorneni?: number
          posledni_upozorneni_at?: string | null
          stav?: Database["public"]["Enums"]["stav_pripominky"]
          technik_id?: string
          typ?: Database["public"]["Enums"]["typ_pripominky"]
          updated_at?: string
          zakazka_id?: string
          zasah_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pripominky_terminu_technik_id_fkey"
            columns: ["technik_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pripominky_terminu_zakazka_id_fkey"
            columns: ["zakazka_id"]
            isOneToOne: false
            referencedRelation: "zakazky"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pripominky_terminu_zasah_id_fkey"
            columns: ["zasah_id"]
            isOneToOne: false
            referencedRelation: "zasahy"
            referencedColumns: ["id"]
          },
        ]
      }
      pripravky: {
        Row: {
          aktivni: boolean
          baleni: string | null
          cilovy_skudce: Json | null
          created_at: string
          deleted_at: string | null
          forma: Database["public"]["Enums"]["forma_pripravku"]
          id: string
          nazev: string
          omezeni_prostor: Json | null
          poznamka: string | null
          protilatka: string | null
          typ: Database["public"]["Enums"]["typ_pripravku"]
          ucinna_latka: string | null
          updated_at: string
        }
        Insert: {
          aktivni?: boolean
          baleni?: string | null
          cilovy_skudce?: Json | null
          created_at?: string
          deleted_at?: string | null
          forma?: Database["public"]["Enums"]["forma_pripravku"]
          id?: string
          nazev: string
          omezeni_prostor?: Json | null
          poznamka?: string | null
          protilatka?: string | null
          typ: Database["public"]["Enums"]["typ_pripravku"]
          ucinna_latka?: string | null
          updated_at?: string
        }
        Update: {
          aktivni?: boolean
          baleni?: string | null
          cilovy_skudce?: Json | null
          created_at?: string
          deleted_at?: string | null
          forma?: Database["public"]["Enums"]["forma_pripravku"]
          id?: string
          nazev?: string
          omezeni_prostor?: Json | null
          poznamka?: string | null
          protilatka?: string | null
          typ?: Database["public"]["Enums"]["typ_pripravku"]
          ucinna_latka?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aktivni_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          jmeno: string
          klient_id: string | null
          koeficient_rychlosti: number
          pobocka: string | null
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
          klient_id?: string | null
          koeficient_rychlosti?: number
          pobocka?: string | null
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
          klient_id?: string | null
          koeficient_rychlosti?: number
          pobocka?: string | null
          prijmeni?: string
          role?: Database["public"]["Enums"]["app_role"][]
          telefon?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      protokol_deratizacni_body: {
        Row: {
          cislo_bodu: string
          created_at: string
          deleted_at: string | null
          id: string
          okruh_id: string | null
          pozer_procent: number
          pripravek_id: string | null
          protokol_id: string
          stav_stanicky: Database["public"]["Enums"]["stav_stanicky"]
          typ_stanicky: Database["public"]["Enums"]["typ_stanicky"]
          updated_at: string
        }
        Insert: {
          cislo_bodu: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          okruh_id?: string | null
          pozer_procent?: number
          pripravek_id?: string | null
          protokol_id: string
          stav_stanicky?: Database["public"]["Enums"]["stav_stanicky"]
          typ_stanicky: Database["public"]["Enums"]["typ_stanicky"]
          updated_at?: string
        }
        Update: {
          cislo_bodu?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          okruh_id?: string | null
          pozer_procent?: number
          pripravek_id?: string | null
          protokol_id?: string
          stav_stanicky?: Database["public"]["Enums"]["stav_stanicky"]
          typ_stanicky?: Database["public"]["Enums"]["typ_stanicky"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "protokol_deratizacni_body_okruh_id_fkey"
            columns: ["okruh_id"]
            isOneToOne: false
            referencedRelation: "okruhy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protokol_deratizacni_body_pripravek_id_fkey"
            columns: ["pripravek_id"]
            isOneToOne: false
            referencedRelation: "pripravky"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protokol_deratizacni_body_protokol_id_fkey"
            columns: ["protokol_id"]
            isOneToOne: false
            referencedRelation: "protokoly"
            referencedColumns: ["id"]
          },
        ]
      }
      protokol_dezinsekci_body: {
        Row: {
          cislo_bodu: string
          created_at: string
          deleted_at: string | null
          druh_hmyzu: string | null
          id: string
          okruh_id: string | null
          pocet: number
          protokol_id: string
          typ_lapace: Database["public"]["Enums"]["typ_lapace"]
          updated_at: string
        }
        Insert: {
          cislo_bodu: string
          created_at?: string
          deleted_at?: string | null
          druh_hmyzu?: string | null
          id?: string
          okruh_id?: string | null
          pocet?: number
          protokol_id: string
          typ_lapace: Database["public"]["Enums"]["typ_lapace"]
          updated_at?: string
        }
        Update: {
          cislo_bodu?: string
          created_at?: string
          deleted_at?: string | null
          druh_hmyzu?: string | null
          id?: string
          okruh_id?: string | null
          pocet?: number
          protokol_id?: string
          typ_lapace?: Database["public"]["Enums"]["typ_lapace"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "protokol_dezinsekci_body_okruh_id_fkey"
            columns: ["okruh_id"]
            isOneToOne: false
            referencedRelation: "okruhy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protokol_dezinsekci_body_protokol_id_fkey"
            columns: ["protokol_id"]
            isOneToOne: false
            referencedRelation: "protokoly"
            referencedColumns: ["id"]
          },
        ]
      }
      protokol_fotky: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          popis: string | null
          protokol_id: string
          soubor_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          popis?: string | null
          protokol_id: string
          soubor_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          popis?: string | null
          protokol_id?: string
          soubor_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "protokol_fotky_protokol_id_fkey"
            columns: ["protokol_id"]
            isOneToOne: false
            referencedRelation: "protokoly"
            referencedColumns: ["id"]
          },
        ]
      }
      protokol_postrik: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          plocha_m2: number | null
          poznamka: string | null
          protokol_id: string
          skudce: string | null
          typ_zakroku: Database["public"]["Enums"]["typ_zakroku"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          plocha_m2?: number | null
          poznamka?: string | null
          protokol_id: string
          skudce?: string | null
          typ_zakroku?: Database["public"]["Enums"]["typ_zakroku"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          plocha_m2?: number | null
          poznamka?: string | null
          protokol_id?: string
          skudce?: string | null
          typ_zakroku?: Database["public"]["Enums"]["typ_zakroku"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "protokol_postrik_protokol_id_fkey"
            columns: ["protokol_id"]
            isOneToOne: false
            referencedRelation: "protokoly"
            referencedColumns: ["id"]
          },
        ]
      }
      protokol_postrik_pripravky: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          koncentrace_procent: number | null
          postrik_id: string
          pripravek_id: string
          spotreba: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          koncentrace_procent?: number | null
          postrik_id: string
          pripravek_id: string
          spotreba?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          koncentrace_procent?: number | null
          postrik_id?: string
          pripravek_id?: string
          spotreba?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "protokol_postrik_pripravky_postrik_id_fkey"
            columns: ["postrik_id"]
            isOneToOne: false
            referencedRelation: "protokol_postrik"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protokol_postrik_pripravky_pripravek_id_fkey"
            columns: ["pripravek_id"]
            isOneToOne: false
            referencedRelation: "pripravky"
            referencedColumns: ["id"]
          },
        ]
      }
      protokoly: {
        Row: {
          admin_komentar: string | null
          ai_hodnoceni: string | null
          cislo_protokolu: string | null
          created_at: string
          deleted_at: string | null
          id: string
          podpis_klient_url: string | null
          poznamka: string | null
          status: Database["public"]["Enums"]["status_protokolu"]
          technik_id: string
          updated_at: string
          veta_ucinnosti: string | null
          zasah_id: string
          zodpovedny_technik: string
        }
        Insert: {
          admin_komentar?: string | null
          ai_hodnoceni?: string | null
          cislo_protokolu?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          podpis_klient_url?: string | null
          poznamka?: string | null
          status?: Database["public"]["Enums"]["status_protokolu"]
          technik_id: string
          updated_at?: string
          veta_ucinnosti?: string | null
          zasah_id: string
          zodpovedny_technik?: string
        }
        Update: {
          admin_komentar?: string | null
          ai_hodnoceni?: string | null
          cislo_protokolu?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          podpis_klient_url?: string | null
          poznamka?: string | null
          status?: Database["public"]["Enums"]["status_protokolu"]
          technik_id?: string
          updated_at?: string
          veta_ucinnosti?: string | null
          zasah_id?: string
          zodpovedny_technik?: string
        }
        Relationships: [
          {
            foreignKeyName: "protokoly_technik_id_fkey"
            columns: ["technik_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protokoly_zasah_id_fkey"
            columns: ["zasah_id"]
            isOneToOne: false
            referencedRelation: "zasahy"
            referencedColumns: ["id"]
          },
        ]
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
      sablony_pouceni: {
        Row: {
          aktivni: boolean
          created_at: string
          deleted_at: string | null
          id: string
          nazev: string
          obsah: string
          skudce_id: string | null
          typ_zasahu: string | null
          updated_at: string
        }
        Insert: {
          aktivni?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          nazev: string
          obsah?: string
          skudce_id?: string | null
          typ_zasahu?: string | null
          updated_at?: string
        }
        Update: {
          aktivni?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          nazev?: string
          obsah?: string
          skudce_id?: string | null
          typ_zasahu?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sablony_pouceni_skudce_id_fkey"
            columns: ["skudce_id"]
            isOneToOne: false
            referencedRelation: "skudci"
            referencedColumns: ["id"]
          },
        ]
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
      zakazka_polozky: {
        Row: {
          cena_celkem: number
          cena_za_kus: number
          created_at: string
          deleted_at: string | null
          id: string
          nazev: string
          pocet: number
          poradi: number
          updated_at: string
          zakazka_id: string
        }
        Insert: {
          cena_celkem: number
          cena_za_kus: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          nazev: string
          pocet?: number
          poradi?: number
          updated_at?: string
          zakazka_id: string
        }
        Update: {
          cena_celkem?: number
          cena_za_kus?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          nazev?: string
          pocet?: number
          poradi?: number
          updated_at?: string
          zakazka_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zakazka_polozky_zakazka_id_fkey"
            columns: ["zakazka_id"]
            isOneToOne: false
            referencedRelation: "zakazky"
            referencedColumns: ["id"]
          },
        ]
      }
      zakazka_sablony: {
        Row: {
          id: string
          nazev: string
          typ: string
          typy_zasahu: string[]
          skudci: string[]
          poznamka_template: string | null
          poradi: number
          aktivni: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          nazev: string
          typ?: string
          typy_zasahu?: string[]
          skudci?: string[]
          poznamka_template?: string | null
          poradi?: number
          aktivni?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          nazev?: string
          typ?: string
          typy_zasahu?: string[]
          skudci?: string[]
          poznamka_template?: string | null
          poradi?: number
          aktivni?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      zakazky: {
        Row: {
          cena_po_sleve: number | null
          cena_s_dph: number | null
          cena_zaklad: number | null
          cetnost_dny: number | null
          created_at: string
          deleted_at: string | null
          doprava_km: number | null
          dph_sazba_snapshot: number | null
          id: string
          je_nocni: boolean | null
          je_prvni_navsteva: boolean | null
          je_vikend: boolean | null
          objekt_id: string
          platba_predem: boolean
          platnost_do: string | null
          pocet_bytu: number | null
          pocet_navstev_rocne: number | null
          poznamka: string | null
          skudci: Json
          sleva_hodnota: number | null
          sleva_typ: string | null
          sleva_zadal: string | null
          status: Database["public"]["Enums"]["status_zakazky"]
          typ: Database["public"]["Enums"]["typ_zakazky"]
          typy_zasahu: Json
          updated_at: string
        }
        Insert: {
          cena_po_sleve?: number | null
          cena_s_dph?: number | null
          cena_zaklad?: number | null
          cetnost_dny?: number | null
          created_at?: string
          deleted_at?: string | null
          doprava_km?: number | null
          dph_sazba_snapshot?: number | null
          id?: string
          je_nocni?: boolean | null
          je_prvni_navsteva?: boolean | null
          je_vikend?: boolean | null
          objekt_id: string
          platba_predem?: boolean
          platnost_do?: string | null
          pocet_bytu?: number | null
          pocet_navstev_rocne?: number | null
          poznamka?: string | null
          skudci?: Json
          sleva_hodnota?: number | null
          sleva_typ?: string | null
          sleva_zadal?: string | null
          status?: Database["public"]["Enums"]["status_zakazky"]
          typ?: Database["public"]["Enums"]["typ_zakazky"]
          typy_zasahu?: Json
          updated_at?: string
        }
        Update: {
          cena_po_sleve?: number | null
          cena_s_dph?: number | null
          cena_zaklad?: number | null
          cetnost_dny?: number | null
          created_at?: string
          deleted_at?: string | null
          doprava_km?: number | null
          dph_sazba_snapshot?: number | null
          id?: string
          je_nocni?: boolean | null
          je_prvni_navsteva?: boolean | null
          je_vikend?: boolean | null
          objekt_id?: string
          platba_predem?: boolean
          platnost_do?: string | null
          pocet_bytu?: number | null
          pocet_navstev_rocne?: number | null
          poznamka?: string | null
          skudci?: Json
          sleva_hodnota?: number | null
          sleva_typ?: string | null
          sleva_zadal?: string | null
          status?: Database["public"]["Enums"]["status_zakazky"]
          typ?: Database["public"]["Enums"]["typ_zakazky"]
          typy_zasahu?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zakazky_objekt_id_fkey"
            columns: ["objekt_id"]
            isOneToOne: false
            referencedRelation: "objekty"
            referencedColumns: ["id"]
          },
        ]
      }
      zasahy: {
        Row: {
          cas_do: string
          cas_od: string
          created_at: string
          datum: string
          deleted_at: string | null
          id: string
          odhadovana_delka_min: number | null
          odlozeni_duvod: string | null
          odlozeno_at: string | null
          odlozeno_kym: string | null
          poznamka: string | null
          puvodni_datum: string | null
          status: Database["public"]["Enums"]["status_zasahu"]
          technik_id: string
          updated_at: string
          zakazka_id: string
        }
        Insert: {
          cas_do: string
          cas_od: string
          created_at?: string
          datum: string
          deleted_at?: string | null
          id?: string
          odhadovana_delka_min?: number | null
          odlozeni_duvod?: string | null
          odlozeno_at?: string | null
          odlozeno_kym?: string | null
          poznamka?: string | null
          puvodni_datum?: string | null
          status?: Database["public"]["Enums"]["status_zasahu"]
          technik_id: string
          updated_at?: string
          zakazka_id: string
        }
        Update: {
          cas_do?: string
          cas_od?: string
          created_at?: string
          datum?: string
          deleted_at?: string | null
          id?: string
          odhadovana_delka_min?: number | null
          odlozeni_duvod?: string | null
          odlozeno_at?: string | null
          odlozeno_kym?: string | null
          poznamka?: string | null
          puvodni_datum?: string | null
          status?: Database["public"]["Enums"]["status_zasahu"]
          technik_id?: string
          updated_at?: string
          zakazka_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zasahy_technik_id_fkey"
            columns: ["technik_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zasahy_zakazka_id_fkey"
            columns: ["zakazka_id"]
            isOneToOne: false
            referencedRelation: "zakazky"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_cislo_protokolu: {
        Args: { p_zasah_id: string }
        Returns: string
      }
      is_admin_or_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "technik" | "klient"
      forma_pripravku:
        | "pasta"
        | "granule"
        | "gel"
        | "kapalina"
        | "prasek"
        | "aerosol"
        | "pena"
        | "tablety"
        | "voskovy_blok"
        | "mikrokapsule"
        | "jiny"
      stav_bonusu: "pending" | "proplaceno"
      stav_emailu: "odeslano" | "doruceno" | "chyba" | "cekajici"
      stav_faktury: "vytvorena" | "odeslana" | "uhrazena" | "po_splatnosti" | "storno"
      typ_emailu: "protokol" | "faktura" | "terminy" | "pripominky" | "odlozeni"
      status_protokolu:
        | "rozpracovany"
        | "ke_schvaleni"
        | "schvaleny"
        | "odeslany"
      status_zakazky: "nova" | "aktivni" | "pozastavena" | "ukoncena"
      status_zasahu:
        | "naplanovano"
        | "potvrzeny"
        | "probiha"
        | "hotovo"
        | "zruseno"
      stav_pripominky: "aktivni" | "vyreseno"
      stav_stanicky:
        | "zavedena"
        | "odcizena"
        | "znovu_zavedena"
        | "poskozena"
        | "ok"
      typ_klienta: "firma" | "fyzicka_osoba"
      typ_lapace: "lezouci_hmyz" | "letajici_hmyz" | "lepova" | "elektronicka"
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
      typ_bonusu: "zakazka" | "opakovana_zakazka" | "fixni"
      typ_pripominky: "technik_nenastavil" | "klient_nevybral"
      typ_pripravku:
        | "rodenticid"
        | "insekticid"
        | "biocid"
        | "dezinfekce"
        | "repelent"
      typ_prostoru:
        | "potravinarsky"
        | "domacnost"
        | "prumysl"
        | "venkovni"
        | "zemedelsky"
        | "chov_zvirat"
      typ_skudce: "hlodavec" | "lezouci_hmyz" | "letajici_hmyz" | "ostatni"
      typ_stanicky:
        | "zivolovna"
        | "mys"
        | "potkan"
        | "sklopna_mys"
        | "sklopna_potkan"
      typ_zakazky: "jednorazova" | "smluvni"
      typ_zakroku: "postrik" | "ulv" | "poprash" | "gelova_nastraha"
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
      forma_pripravku: [
        "pasta",
        "granule",
        "gel",
        "kapalina",
        "prasek",
        "aerosol",
        "pena",
        "tablety",
        "voskovy_blok",
        "mikrokapsule",
        "jiny",
      ],
      stav_emailu: ["odeslano", "doruceno", "chyba", "cekajici"],
      typ_emailu: ["protokol", "faktura", "terminy", "pripominky"],
      status_protokolu: [
        "rozpracovany",
        "ke_schvaleni",
        "schvaleny",
        "odeslany",
      ],
      status_zakazky: ["nova", "aktivni", "pozastavena", "ukoncena"],
      status_zasahu: [
        "naplanovano",
        "potvrzeny",
        "probiha",
        "hotovo",
        "zruseno",
      ],
      stav_pripominky: ["aktivni", "vyreseno"],
      stav_stanicky: [
        "zavedena",
        "odcizena",
        "znovu_zavedena",
        "poskozena",
        "ok",
      ],
      typ_klienta: ["firma", "fyzicka_osoba"],
      typ_lapace: ["lezouci_hmyz", "letajici_hmyz", "lepova", "elektronicka"],
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
      typ_pripominky: ["technik_nenastavil", "klient_nevybral"],
      typ_pripravku: [
        "rodenticid",
        "insekticid",
        "biocid",
        "dezinfekce",
        "repelent",
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
      typ_stanicky: [
        "zivolovna",
        "mys",
        "potkan",
        "sklopna_mys",
        "sklopna_potkan",
      ],
      typ_zakazky: ["jednorazova", "smluvni"],
      typ_zakroku: ["postrik", "ulv", "poprash", "gelova_nastraha"],
      typ_zasahu_kalkulacka: [
        "vnitrni_deratizace",
        "vnejsi_deratizace",
        "vnitrni_dezinsekce",
        "postrik",
      ],
    },
  },
} as const
