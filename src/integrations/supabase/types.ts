export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          display_name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      style_quizzes: {
        Row: {
          id: string
          user_id: string
          gender: string | null
          age_group: string | null
          height: string | null
          weight: string | null
          body_type: string | null
          skin_tone: string | null
          preferred_fit: string | null
          color_palette: string[]
          style_preferences: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gender?: string | null
          age_group?: string | null
          height?: string | null
          weight?: string | null
          body_type?: string | null
          skin_tone?: string | null
          preferred_fit?: string | null
          color_palette?: string[]
          style_preferences?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          gender?: string | null
          age_group?: string | null
          height?: string | null
          weight?: string | null
          body_type?: string | null
          skin_tone?: string | null
          preferred_fit?: string | null
          color_palette?: string[]
          style_preferences?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      generated_outfits: {
        Row: {
          id: string
          user_id: string
          occasion: string
          outfit_json: Json
          is_saved: boolean
          is_new: boolean
          wore_at: string | null
          wore_rating: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          occasion: string
          outfit_json: Json
          is_saved?: boolean
          is_new?: boolean
          wore_at?: string | null
          wore_rating?: number | null
          created_at?: string
        }
        Update: {
          is_saved?: boolean
          is_new?: boolean
          wore_at?: string | null
          wore_rating?: number | null
        }
        Relationships: []
      }
      user_interactions: {
        Row: {
          id: string
          user_id: string
          outfit_id: string | null
          interaction_type: string
          style_tags: string[]
          outfit_description: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          outfit_id?: string | null
          interaction_type: string
          style_tags?: string[]
          outfit_description?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          style_tags?: string[]
          metadata?: Json | null
        }
        Relationships: []
      }
      user_wardrobe: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string | null
          color: string | null
          style_tags: string[]
          image_url: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category?: string | null
          color?: string | null
          style_tags?: string[]
          image_url?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          category?: string | null
          color?: string | null
          style_tags?: string[]
          image_url?: string | null
          notes?: string | null
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

// Additional type helpers
export type GeneratedOutfitRow = Database['public']['Tables']['generated_outfits']['Row']
export type StyleQuizRow = Database['public']['Tables']['style_quizzes']['Row']
export type UserInteractionRow = Database['public']['Tables']['user_interactions']['Row']
export type WardrobeRow = Database['public']['Tables']['user_wardrobe']['Row']
