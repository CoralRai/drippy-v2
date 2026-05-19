-- Grant service_role permissions for generate-outfits function
GRANT SELECT ON public.style_quizzes TO service_role;
GRANT SELECT ON public.user_interactions TO service_role;
GRANT SELECT ON public.generated_outfits TO service_role;
GRANT SELECT ON public.user_wardrobe TO service_role;
GRANT INSERT ON public.generated_outfits TO service_role;
GRANT UPDATE ON public.generated_outfits TO service_role;
