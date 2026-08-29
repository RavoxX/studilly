// Generated from the Supabase schema. Do not edit by hand.
// Regenerate with: npm run db:types

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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      answer_evaluations: {
        Row: {
          attempt_id: string
          created_at: string
          criteria_results: Json
          explanation: string
          id: string
          improvement: string
          misconceptions: string[]
          missing_elements: string[]
          points_awarded: number
          points_possible: number
          strengths: string[]
          task_id: string
          user_id: string
          verdict: Database["public"]["Enums"]["answer_verdict"]
        }
        Insert: {
          attempt_id: string
          created_at?: string
          criteria_results?: Json
          explanation?: string
          id?: string
          improvement?: string
          misconceptions?: string[]
          missing_elements?: string[]
          points_awarded: number
          points_possible: number
          strengths?: string[]
          task_id: string
          user_id: string
          verdict: Database["public"]["Enums"]["answer_verdict"]
        }
        Update: {
          attempt_id?: string
          created_at?: string
          criteria_results?: Json
          explanation?: string
          id?: string
          improvement?: string
          misconceptions?: string[]
          missing_elements?: string[]
          points_awarded?: number
          points_possible?: number
          strengths?: string[]
          task_id?: string
          user_id?: string
          verdict?: Database["public"]["Enums"]["answer_verdict"]
        }
        Relationships: [
          {
            foreignKeyName: "answer_evaluations_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_evaluations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "exam_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      curricula: {
        Row: {
          bundesland: Database["public"]["Enums"]["bundesland"]
          created_at: string
          grade_max: number
          grade_min: number
          id: string
          is_official: boolean
          school_type: Database["public"]["Enums"]["school_type"]
          source_name: string
          source_retrieved_at: string | null
          source_url: string | null
          source_version: string | null
          stage: Database["public"]["Enums"]["education_stage"]
          subject_id: string
          title: string
          updated_at: string
        }
        Insert: {
          bundesland: Database["public"]["Enums"]["bundesland"]
          created_at?: string
          grade_max: number
          grade_min: number
          id?: string
          is_official?: boolean
          school_type: Database["public"]["Enums"]["school_type"]
          source_name: string
          source_retrieved_at?: string | null
          source_url?: string | null
          source_version?: string | null
          stage: Database["public"]["Enums"]["education_stage"]
          subject_id: string
          title: string
          updated_at?: string
        }
        Update: {
          bundesland?: Database["public"]["Enums"]["bundesland"]
          created_at?: string
          grade_max?: number
          grade_min?: number
          id?: string
          is_official?: boolean
          school_type?: Database["public"]["Enums"]["school_type"]
          source_name?: string
          source_retrieved_at?: string | null
          source_url?: string | null
          source_version?: string | null
          stage?: Database["public"]["Enums"]["education_stage"]
          subject_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curricula_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_topics: {
        Row: {
          competencies: string[]
          created_at: string
          curriculum_id: string
          description: string | null
          grade_hint: number | null
          id: string
          parent_id: string | null
          position: number
          title_de: string
          title_en: string | null
          typical_afb: Database["public"]["Enums"]["afb_level"] | null
        }
        Insert: {
          competencies?: string[]
          created_at?: string
          curriculum_id: string
          description?: string | null
          grade_hint?: number | null
          id?: string
          parent_id?: string | null
          position?: number
          title_de: string
          title_en?: string | null
          typical_afb?: Database["public"]["Enums"]["afb_level"] | null
        }
        Update: {
          competencies?: string[]
          created_at?: string
          curriculum_id?: string
          description?: string | null
          grade_hint?: number | null
          id?: string
          parent_id?: string | null
          position?: number
          title_de?: string
          title_en?: string | null
          typical_afb?: Database["public"]["Enums"]["afb_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_topics_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_topics_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "curriculum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      education_profiles: {
        Row: {
          bundesland: Database["public"]["Enums"]["bundesland"]
          created_at: string
          grade: number
          oberstufe_phase: string | null
          school_type: Database["public"]["Enums"]["school_type"]
          stage: Database["public"]["Enums"]["education_stage"]
          updated_at: string
          user_id: string
        }
        Insert: {
          bundesland: Database["public"]["Enums"]["bundesland"]
          created_at?: string
          grade: number
          oberstufe_phase?: string | null
          school_type: Database["public"]["Enums"]["school_type"]
          stage: Database["public"]["Enums"]["education_stage"]
          updated_at?: string
          user_id: string
        }
        Update: {
          bundesland?: Database["public"]["Enums"]["bundesland"]
          created_at?: string
          grade?: number
          oberstufe_phase?: string | null
          school_type?: Database["public"]["Enums"]["school_type"]
          stage?: Database["public"]["Enums"]["education_stage"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_answers: {
        Row: {
          answer_text: string
          attempt_id: string
          created_at: string
          id: string
          is_flagged: boolean
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_text?: string
          attempt_id: string
          created_at?: string
          id?: string
          is_flagged?: boolean
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_text?: string
          attempt_id?: string
          created_at?: string
          id?: string
          is_flagged?: boolean
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_answers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "exam_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          created_at: string
          error_message: string | null
          exam_id: string
          feedback_summary: Json | null
          grade_label: string | null
          grade_value: number | null
          graded_at: string | null
          grading_scale_id: string | null
          id: string
          model_used: string | null
          percentage: number | null
          points_awarded: number | null
          points_possible: number | null
          started_at: string
          status: Database["public"]["Enums"]["attempt_status"]
          submitted_at: string | null
          time_spent_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          exam_id: string
          feedback_summary?: Json | null
          grade_label?: string | null
          grade_value?: number | null
          graded_at?: string | null
          grading_scale_id?: string | null
          id?: string
          model_used?: string | null
          percentage?: number | null
          points_awarded?: number | null
          points_possible?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          submitted_at?: string | null
          time_spent_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          exam_id?: string
          feedback_summary?: Json | null
          grade_label?: string | null
          grade_value?: number | null
          graded_at?: string | null
          grading_scale_id?: string | null
          id?: string
          model_used?: string | null
          percentage?: number | null
          points_awarded?: number | null
          points_possible?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          submitted_at?: string | null
          time_spent_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_grading_scale_id_fkey"
            columns: ["grading_scale_id"]
            isOneToOne: false
            referencedRelation: "grading_scales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_tasks: {
        Row: {
          afb: Database["public"]["Enums"]["afb_level"] | null
          created_at: string
          erwartungshorizont: Json
          exam_id: string
          expected_solution: string | null
          id: string
          label: string
          operator: string | null
          parent_task_id: string | null
          points: number
          position: number
          prompt: string
          stimulus: string | null
          user_id: string
        }
        Insert: {
          afb?: Database["public"]["Enums"]["afb_level"] | null
          created_at?: string
          erwartungshorizont?: Json
          exam_id: string
          expected_solution?: string | null
          id?: string
          label: string
          operator?: string | null
          parent_task_id?: string | null
          points?: number
          position: number
          prompt: string
          stimulus?: string | null
          user_id: string
        }
        Update: {
          afb?: Database["public"]["Enums"]["afb_level"] | null
          created_at?: string
          erwartungshorizont?: Json
          exam_id?: string
          expected_solution?: string | null
          id?: string
          label?: string
          operator?: string | null
          parent_task_id?: string | null
          points?: number
          position?: number
          prompt?: string
          stimulus?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_tasks_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "exam_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          bundesland: Database["public"]["Enums"]["bundesland"]
          created_at: string
          difficulty: string
          duration_minutes: number
          error_message: string | null
          grade: number
          grading_scale_id: string | null
          id: string
          instructions: string
          model_used: string | null
          prompt_version: string | null
          school_type: Database["public"]["Enums"]["school_type"]
          source_material_ids: string[]
          stage: Database["public"]["Enums"]["education_stage"]
          status: Database["public"]["Enums"]["exam_status"]
          subject_id: string
          title: string
          topic_selection: Json
          total_points: number
          updated_at: string
          user_id: string
          validation_report: Json | null
        }
        Insert: {
          bundesland: Database["public"]["Enums"]["bundesland"]
          created_at?: string
          difficulty?: string
          duration_minutes: number
          error_message?: string | null
          grade: number
          grading_scale_id?: string | null
          id?: string
          instructions?: string
          model_used?: string | null
          prompt_version?: string | null
          school_type: Database["public"]["Enums"]["school_type"]
          source_material_ids?: string[]
          stage: Database["public"]["Enums"]["education_stage"]
          status?: Database["public"]["Enums"]["exam_status"]
          subject_id: string
          title: string
          topic_selection?: Json
          total_points?: number
          updated_at?: string
          user_id: string
          validation_report?: Json | null
        }
        Update: {
          bundesland?: Database["public"]["Enums"]["bundesland"]
          created_at?: string
          difficulty?: string
          duration_minutes?: number
          error_message?: string | null
          grade?: number
          grading_scale_id?: string | null
          id?: string
          instructions?: string
          model_used?: string | null
          prompt_version?: string | null
          school_type?: Database["public"]["Enums"]["school_type"]
          source_material_ids?: string[]
          stage?: Database["public"]["Enums"]["education_stage"]
          status?: Database["public"]["Enums"]["exam_status"]
          subject_id?: string
          title?: string
          topic_selection?: Json
          total_points?: number
          updated_at?: string
          user_id?: string
          validation_report?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_grading_scale_id_fkey"
            columns: ["grading_scale_id"]
            isOneToOne: false
            referencedRelation: "grading_scales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_reviews: {
        Row: {
          card_id: string
          id: string
          new_interval: number
          previous_interval: number
          rating: number
          reviewed_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          id?: string
          new_interval?: number
          previous_interval?: number
          rating: number
          reviewed_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          id?: string
          new_interval?: number
          previous_interval?: number
          rating?: number
          reviewed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          created_at: string
          difficulty: string
          due_at: string
          ease_factor: number
          front: string
          id: string
          interval_days: number
          lapses: number
          last_reviewed_at: string | null
          origin: string
          repetitions: number
          source_material_id: string | null
          source_weakness_id: string | null
          subject_id: string | null
          suspended: boolean
          topic_label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string
          difficulty?: string
          due_at?: string
          ease_factor?: number
          front: string
          id?: string
          interval_days?: number
          lapses?: number
          last_reviewed_at?: string | null
          origin?: string
          repetitions?: number
          source_material_id?: string | null
          source_weakness_id?: string | null
          subject_id?: string | null
          suspended?: boolean
          topic_label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string
          difficulty?: string
          due_at?: string
          ease_factor?: number
          front?: string
          id?: string
          interval_days?: number
          lapses?: number
          last_reviewed_at?: string | null
          origin?: string
          repetitions?: number
          source_material_id?: string | null
          source_weakness_id?: string | null
          subject_id?: string | null
          suspended?: boolean
          topic_label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_source_material_id_fkey"
            columns: ["source_material_id"]
            isOneToOne: false
            referencedRelation: "learning_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_source_weakness_id_fkey"
            columns: ["source_weakness_id"]
            isOneToOne: false
            referencedRelation: "weaknesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_scales: {
        Row: {
          bundesland: Database["public"]["Enums"]["bundesland"] | null
          created_at: string
          id: string
          is_default: boolean
          key: string
          name_de: string
          name_en: string
          scale_type: string
          source_note: string | null
          stage: Database["public"]["Enums"]["education_stage"]
          thresholds: Json
        }
        Insert: {
          bundesland?: Database["public"]["Enums"]["bundesland"] | null
          created_at?: string
          id?: string
          is_default?: boolean
          key: string
          name_de: string
          name_en: string
          scale_type: string
          source_note?: string | null
          stage: Database["public"]["Enums"]["education_stage"]
          thresholds: Json
        }
        Update: {
          bundesland?: Database["public"]["Enums"]["bundesland"] | null
          created_at?: string
          id?: string
          is_default?: boolean
          key?: string
          name_de?: string
          name_en?: string
          scale_type?: string
          source_note?: string | null
          stage?: Database["public"]["Enums"]["education_stage"]
          thresholds?: Json
        }
        Relationships: []
      }
      learning_materials: {
        Row: {
          char_count: number | null
          created_at: string
          detected_language: string | null
          error_message: string | null
          id: string
          mime_type: string
          original_filename: string
          page_count: number | null
          processed_at: string | null
          size_bytes: number
          status: Database["public"]["Enums"]["material_status"]
          storage_path: string
          subject_id: string | null
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          char_count?: number | null
          created_at?: string
          detected_language?: string | null
          error_message?: string | null
          id?: string
          mime_type: string
          original_filename: string
          page_count?: number | null
          processed_at?: string | null
          size_bytes: number
          status?: Database["public"]["Enums"]["material_status"]
          storage_path: string
          subject_id?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          char_count?: number | null
          created_at?: string
          detected_language?: string | null
          error_message?: string | null
          id?: string
          mime_type?: string
          original_filename?: string
          page_count?: number | null
          processed_at?: string | null
          size_bytes?: number
          status?: Database["public"]["Enums"]["material_status"]
          storage_path?: string
          subject_id?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_materials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_plan_items: {
        Row: {
          activity: string
          completed_at: string | null
          created_at: string
          description: string
          estimated_minutes: number
          id: string
          plan_id: string
          position: number
          scheduled_for: string
          status: string
          title: string
          topic_label: string | null
          user_id: string
        }
        Insert: {
          activity: string
          completed_at?: string | null
          created_at?: string
          description?: string
          estimated_minutes?: number
          id?: string
          plan_id: string
          position?: number
          scheduled_for: string
          status?: string
          title: string
          topic_label?: string | null
          user_id: string
        }
        Update: {
          activity?: string
          completed_at?: string | null
          created_at?: string
          description?: string
          estimated_minutes?: number
          id?: string
          plan_id?: string
          position?: number
          scheduled_for?: string
          status?: string
          title?: string
          topic_label?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "learning_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_plan_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_plans: {
        Row: {
          created_at: string
          error_message: string | null
          exam_date: string
          id: string
          last_adapted_at: string | null
          model_used: string | null
          status: string
          subject_id: string
          title: string
          updated_at: string
          user_id: string
          weekly_minutes: number
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          exam_date: string
          id?: string
          last_adapted_at?: string | null
          model_used?: string | null
          status?: string
          subject_id: string
          title: string
          updated_at?: string
          user_id: string
          weekly_minutes?: number
        }
        Update: {
          created_at?: string
          error_message?: string | null
          exam_date?: string
          id?: string
          last_adapted_at?: string | null
          model_used?: string | null
          status?: string
          subject_id?: string
          title?: string
          updated_at?: string
          user_id?: string
          weekly_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "learning_plans_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      material_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          heading: string | null
          id: string
          material_id: string
          page_from: number | null
          page_to: number | null
          token_estimate: number
          user_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          embedding?: string | null
          heading?: string | null
          id?: string
          material_id: string
          page_from?: number | null
          page_to?: number | null
          token_estimate?: number
          user_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          heading?: string | null
          id?: string
          material_id?: string
          page_from?: number | null
          page_to?: number | null
          token_estimate?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_chunks_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "learning_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_chunks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      material_topics: {
        Row: {
          created_at: string
          curriculum_topic_id: string | null
          id: string
          match_confidence: number | null
          material_id: string
          position: number
          summary: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          curriculum_topic_id?: string | null
          id?: string
          match_confidence?: number | null
          material_id: string
          position?: number
          summary?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          curriculum_topic_id?: string | null
          id?: string
          match_confidence?: number | null
          material_id?: string
          position?: number
          summary?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_topics_curriculum_topic_id_fkey"
            columns: ["curriculum_topic_id"]
            isOneToOne: false
            referencedRelation: "curriculum_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_topics_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "learning_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_topics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          achievements: boolean
          created_at: string
          email_enabled: boolean
          exam_reminders: boolean
          group_activity: boolean
          plan_reminders: boolean
          practice_reminders: boolean
          subscription_updates: boolean
          updated_at: string
          usage_alerts: boolean
          user_id: string
        }
        Insert: {
          achievements?: boolean
          created_at?: string
          email_enabled?: boolean
          exam_reminders?: boolean
          group_activity?: boolean
          plan_reminders?: boolean
          practice_reminders?: boolean
          subscription_updates?: boolean
          updated_at?: string
          usage_alerts?: boolean
          user_id: string
        }
        Update: {
          achievements?: boolean
          created_at?: string
          email_enabled?: boolean
          exam_reminders?: boolean
          group_activity?: boolean
          plan_reminders?: boolean
          practice_reminders?: boolean
          subscription_updates?: boolean
          updated_at?: string
          usage_alerts?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_attempts: {
        Row: {
          answer_text: string
          created_at: string
          explanation: string
          id: string
          improvement: string
          points_awarded: number
          points_possible: number
          question_id: string
          user_id: string
          verdict: Database["public"]["Enums"]["answer_verdict"] | null
        }
        Insert: {
          answer_text?: string
          created_at?: string
          explanation?: string
          id?: string
          improvement?: string
          points_awarded?: number
          points_possible?: number
          question_id: string
          user_id: string
          verdict?: Database["public"]["Enums"]["answer_verdict"] | null
        }
        Update: {
          answer_text?: string
          created_at?: string
          explanation?: string
          id?: string
          improvement?: string
          points_awarded?: number
          points_possible?: number
          question_id?: string
          user_id?: string
          verdict?: Database["public"]["Enums"]["answer_verdict"] | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "practice_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_questions: {
        Row: {
          afb: Database["public"]["Enums"]["afb_level"] | null
          created_at: string
          erwartungshorizont: Json
          expected_solution: string
          hint: string | null
          id: string
          operator: string | null
          points: number
          position: number
          prompt: string
          set_id: string
          user_id: string
        }
        Insert: {
          afb?: Database["public"]["Enums"]["afb_level"] | null
          created_at?: string
          erwartungshorizont?: Json
          expected_solution?: string
          hint?: string | null
          id?: string
          operator?: string | null
          points?: number
          position: number
          prompt: string
          set_id: string
          user_id: string
        }
        Update: {
          afb?: Database["public"]["Enums"]["afb_level"] | null
          created_at?: string
          erwartungshorizont?: Json
          expected_solution?: string
          hint?: string | null
          id?: string
          operator?: string | null
          points?: number
          position?: number
          prompt?: string
          set_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_questions_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "practice_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sets: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          model_used: string | null
          origin: string
          status: string
          subject_id: string
          title: string
          topic_label: string | null
          user_id: string
          weakness_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          model_used?: string | null
          origin?: string
          status?: string
          subject_id: string
          title: string
          topic_label?: string | null
          user_id: string
          weakness_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          model_used?: string | null
          origin?: string
          status?: string
          subject_id?: string
          title?: string
          topic_label?: string | null
          user_id?: string
          weakness_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_sets_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sets_weakness_id_fkey"
            columns: ["weakness_id"]
            isOneToOne: false
            referencedRelation: "weaknesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          allow_ai_quality_review: boolean
          created_at: string
          display_name: string
          id: string
          onboarding_completed_at: string | null
          theme: string
          ui_locale: Database["public"]["Enums"]["ui_language"]
          updated_at: string
        }
        Insert: {
          allow_ai_quality_review?: boolean
          created_at?: string
          display_name?: string
          id: string
          onboarding_completed_at?: string | null
          theme?: string
          ui_locale?: Database["public"]["Enums"]["ui_language"]
          updated_at?: string
        }
        Update: {
          allow_ai_quality_review?: boolean
          created_at?: string
          display_name?: string
          id?: string
          onboarding_completed_at?: string | null
          theme?: string
          ui_locale?: Database["public"]["Enums"]["ui_language"]
          updated_at?: string
        }
        Relationships: []
      }
      study_group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: Database["public"]["Enums"]["group_role"]
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_role"]
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_messages: {
        Row: {
          body: string
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_shares: {
        Row: {
          created_at: string
          exam_id: string | null
          group_id: string
          id: string
          material_id: string | null
          note: string
          resource_type: string
          shared_by: string
        }
        Insert: {
          created_at?: string
          exam_id?: string | null
          group_id: string
          id?: string
          material_id?: string | null
          note?: string
          resource_type: string
          shared_by: string
        }
        Update: {
          created_at?: string
          exam_id?: string | null
          group_id?: string
          id?: string
          material_id?: string | null
          note?: string
          resource_type?: string
          shared_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_shares_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_shares_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_shares_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "learning_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_group_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          created_at: string
          description: string
          id: string
          invite_code: string
          member_limit: number
          name: string
          owner_id: string
          subject_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          invite_code?: string
          member_limit?: number
          name: string
          owner_id: string
          subject_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invite_code?: string
          member_limit?: number
          name?: string
          owner_id?: string
          subject_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_groups_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          category: string
          id: string
          key: string
          name_de: string
          name_en: string
          position: number
        }
        Insert: {
          category: string
          id?: string
          key: string
          name_de: string
          name_en: string
          position?: number
        }
        Update: {
          category?: string
          id?: string
          key?: string
          name_de?: string
          name_en?: string
          position?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancels_at: string | null
          created_at: string
          current_period_end: string | null
          entitlement_id: string | null
          is_sandbox: boolean
          last_event: Json | null
          last_sync_at: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          provider: string
          rc_customer_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancels_at?: string | null
          created_at?: string
          current_period_end?: string | null
          entitlement_id?: string | null
          is_sandbox?: boolean
          last_event?: Json | null
          last_sync_at?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          provider?: string
          rc_customer_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancels_at?: string | null
          created_at?: string
          current_period_end?: string | null
          entitlement_id?: string | null
          is_sandbox?: boolean
          last_event?: Json | null
          last_sync_at?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          provider?: string
          rc_customer_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_records: {
        Row: {
          created_at: string
          id: string
          metric: string
          period_start: string
          updated_at: string
          used: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric: string
          period_start: string
          updated_at?: string
          used?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metric?: string
          period_start?: string
          updated_at?: string
          used?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subjects: {
        Row: {
          course_level: string | null
          created_at: string
          is_priority: boolean
          subject_id: string
          user_id: string
        }
        Insert: {
          course_level?: string | null
          created_at?: string
          is_priority?: boolean
          subject_id: string
          user_id: string
        }
        Update: {
          course_level?: string | null
          created_at?: string
          is_priority?: boolean
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subjects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weakness_evidence: {
        Row: {
          attempt_id: string | null
          id: string
          note: string
          occurred_at: string
          points_lost: number
          task_id: string | null
          user_id: string
          weakness_id: string
        }
        Insert: {
          attempt_id?: string | null
          id?: string
          note?: string
          occurred_at?: string
          points_lost?: number
          task_id?: string | null
          user_id: string
          weakness_id: string
        }
        Update: {
          attempt_id?: string | null
          id?: string
          note?: string
          occurred_at?: string
          points_lost?: number
          task_id?: string | null
          user_id?: string
          weakness_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weakness_evidence_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weakness_evidence_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "exam_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weakness_evidence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weakness_evidence_weakness_id_fkey"
            columns: ["weakness_id"]
            isOneToOne: false
            referencedRelation: "weaknesses"
            referencedColumns: ["id"]
          },
        ]
      }
      weaknesses: {
        Row: {
          confidence: number
          created_at: string
          curriculum_topic_id: string | null
          dimension: Database["public"]["Enums"]["skill_dimension"]
          evidence_count: number
          first_seen_at: string
          id: string
          last_seen_at: string
          operator: string | null
          resolved_at: string | null
          severity: number
          subject_id: string
          topic_label: string
          trend: Database["public"]["Enums"]["weakness_trend"]
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          curriculum_topic_id?: string | null
          dimension: Database["public"]["Enums"]["skill_dimension"]
          evidence_count?: number
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          operator?: string | null
          resolved_at?: string | null
          severity?: number
          subject_id: string
          topic_label: string
          trend?: Database["public"]["Enums"]["weakness_trend"]
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          curriculum_topic_id?: string | null
          dimension?: Database["public"]["Enums"]["skill_dimension"]
          evidence_count?: number
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          operator?: string | null
          resolved_at?: string | null
          severity?: number
          subject_id?: string
          topic_label?: string
          trend?: Database["public"]["Enums"]["weakness_trend"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weaknesses_curriculum_topic_id_fkey"
            columns: ["curriculum_topic_id"]
            isOneToOne: false
            referencedRelation: "curriculum_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weaknesses_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weaknesses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_usage: {
        Args: {
          amount?: number
          max_allowed: number
          target_metric: string
          target_user: string
        }
        Returns: number
      }
      is_group_member: { Args: { gid: string }; Returns: boolean }
      is_group_owner: { Args: { gid: string }; Returns: boolean }
      match_material_chunks: {
        Args: {
          match_count?: number
          material_ids?: string[]
          min_similarity?: number
          query_embedding: string
          target_user: string
        }
        Returns: {
          chunk_index: number
          content: string
          heading: string
          id: string
          material_id: string
          page_from: number
          similarity: number
        }[]
      }
      release_usage: {
        Args: { amount?: number; target_metric: string; target_user: string }
        Returns: undefined
      }
      user_storage_bytes: { Args: { target_user: string }; Returns: number }
    }
    Enums: {
      afb_level: "I" | "II" | "III"
      answer_verdict:
        | "incorrect"
        | "partially_correct"
        | "correct_incomplete"
        | "correct"
        | "exceptional"
      attempt_status:
        | "in_progress"
        | "submitted"
        | "grading"
        | "graded"
        | "failed"
      bundesland:
        | "BW"
        | "BY"
        | "BE"
        | "BB"
        | "HB"
        | "HH"
        | "HE"
        | "MV"
        | "NI"
        | "NW"
        | "RP"
        | "SL"
        | "SN"
        | "ST"
        | "SH"
        | "TH"
      education_stage: "sek_1" | "sek_2"
      exam_status: "generating" | "ready" | "failed" | "archived"
      group_role: "owner" | "member"
      material_status:
        | "uploaded"
        | "extracting"
        | "analyzing"
        | "ready"
        | "failed"
      plan_tier: "free" | "pro" | "ultra"
      school_type:
        | "gymnasium"
        | "realschule"
        | "hauptschule"
        | "werkrealschule"
        | "gesamtschule"
        | "oberschule"
        | "mittelschule"
        | "stadtteilschule"
        | "sekundarschule"
        | "gemeinschaftsschule"
        | "regionale_schule"
        | "regelschule"
        | "realschule_plus"
        | "integrierte_sekundarschule"
        | "mittelstufenschule"
        | "wirtschaftsschule"
        | "berufliches_gymnasium"
      skill_dimension:
        | "concept"
        | "procedure"
        | "operator"
        | "completeness"
        | "precision"
        | "transfer"
      ui_language: "de" | "en"
      weakness_trend: "improving" | "stable" | "worsening" | "new"
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
      afb_level: ["I", "II", "III"],
      answer_verdict: [
        "incorrect",
        "partially_correct",
        "correct_incomplete",
        "correct",
        "exceptional",
      ],
      attempt_status: [
        "in_progress",
        "submitted",
        "grading",
        "graded",
        "failed",
      ],
      bundesland: [
        "BW",
        "BY",
        "BE",
        "BB",
        "HB",
        "HH",
        "HE",
        "MV",
        "NI",
        "NW",
        "RP",
        "SL",
        "SN",
        "ST",
        "SH",
        "TH",
      ],
      education_stage: ["sek_1", "sek_2"],
      exam_status: ["generating", "ready", "failed", "archived"],
      group_role: ["owner", "member"],
      material_status: [
        "uploaded",
        "extracting",
        "analyzing",
        "ready",
        "failed",
      ],
      plan_tier: ["free", "pro", "ultra"],
      school_type: [
        "gymnasium",
        "realschule",
        "hauptschule",
        "werkrealschule",
        "gesamtschule",
        "oberschule",
        "mittelschule",
        "stadtteilschule",
        "sekundarschule",
        "gemeinschaftsschule",
        "regionale_schule",
        "regelschule",
        "realschule_plus",
        "integrierte_sekundarschule",
        "mittelstufenschule",
        "wirtschaftsschule",
        "berufliches_gymnasium",
      ],
      skill_dimension: [
        "concept",
        "procedure",
        "operator",
        "completeness",
        "precision",
        "transfer",
      ],
      ui_language: ["de", "en"],
      weakness_trend: ["improving", "stable", "worsening", "new"],
    },
  },
} as const
