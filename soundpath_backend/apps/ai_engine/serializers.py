from rest_framework import serializers
from .models import CareerAnalysis, SkillAssessment, CareerRoadmap, Milestone

class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = '__all__'

class CareerRoadmapSerializer(serializers.ModelSerializer):
    milestones = MilestoneSerializer(many=True, read_only=True)
    
    class Meta:
        model = CareerRoadmap
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')

class CareerAnalysisSerializer(serializers.ModelSerializer):
    # Input fields for analysis
    spotify_listeners = serializers.IntegerField(write_only=True, required=False)
    total_streams = serializers.IntegerField(write_only=True, required=False)
    yt_views = serializers.IntegerField(write_only=True, required=False)
    ig_followers = serializers.IntegerField(write_only=True, required=False)
    tt_followers = serializers.IntegerField(write_only=True, required=False)
    engagement_rate = serializers.FloatField(write_only=True, required=False)
    gigs_per_year = serializers.IntegerField(write_only=True, required=False)
    show_revenue = serializers.IntegerField(write_only=True, required=False)
    annual_revenue = serializers.IntegerField(write_only=True, required=False)
    genre = serializers.CharField(write_only=True, required=False)
    primary_goal = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = CareerAnalysis
        fields = '__all__'
        read_only_fields = ('user', 'last_analysis_date')

    def create(self, validated_data):
        # Extract input data
        input_data = {
            'spotify_listeners': validated_data.pop('spotify_listeners', 0),
            'total_streams': validated_data.pop('total_streams', 0),
            'yt_views': validated_data.pop('yt_views', 0),
            'ig_followers': validated_data.pop('ig_followers', 0),
            'tt_followers': validated_data.pop('tt_followers', 0),
            'engagement_rate': validated_data.pop('engagement_rate', 0),
            'gigs_per_year': validated_data.pop('gigs_per_year', 0),
            'show_revenue': validated_data.pop('show_revenue', 0),
            'annual_revenue': validated_data.pop('annual_revenue', 0),
            'genre': validated_data.pop('genre', ''),
            'primary_goal': validated_data.pop('primary_goal', ''),
        }
        
        # Calculate score (simplified version of frontend logic)
        score = self.calculate_score(input_data)
        insights = self.generate_insights(input_data, score)
        
        # Check if user already has a career analysis
        user = validated_data.get('user')
        existing_analysis = CareerAnalysis.objects.filter(user=user).first()
        
        if existing_analysis:
            # Update existing analysis
            existing_analysis.career_score = score
            existing_analysis.actionable_insights = insights
            existing_analysis.status = 'completed'
            existing_analysis.trajectory_forecast = {'next_12_months': 'stable', 'risk_factors': []}
            existing_analysis.peer_cluster = f"{input_data['genre']} artists"
            existing_analysis.raw_ml_output = input_data
            existing_analysis.save()
            return existing_analysis
        
        # Create new analysis
        validated_data.update({
            'career_score': score,
            'actionable_insights': insights,
            'status': 'completed',
            'trajectory_forecast': {'next_12_months': 'stable', 'risk_factors': []},
            'peer_cluster': f"{input_data['genre']} artists",
            'raw_ml_output': input_data,
        })
        
        return super().create(validated_data)

    def calculate_score(self, data):
        # More realistic scoring based on music industry benchmarks
        reach_score = min(100, (
            (data['spotify_listeners'] / 10000) * 20 +  # 10k listeners = 20 points
            (data['total_streams'] / 100000) * 15 +     # 100k streams = 15 points
            (data['yt_views'] / 100000) * 15 +          # 100k views = 15 points
            ((data['ig_followers'] + data['tt_followers']) / 10000) * 10  # 10k followers = 10 points
        ))
        
        eng_score = min(100, data['engagement_rate'] * 8 + 
                       (1 if data['ig_followers'] > 5000 else 0) * 10 +
                       (1 if data['tt_followers'] > 10000 else 0) * 15)
        
        rev_score = min(100, (
            (data['annual_revenue'] / 10000) * 40 +      # 10k revenue = 40 points
            (data['gigs_per_year'] * data['show_revenue'] / 5000) * 30  # gigs revenue
        ))
        
        # Genre adjustment (some genres have different benchmarks)
        genre_multiplier = {'Pop': 1.0, 'Hip-Hop': 1.1, 'Electronic': 0.9, 'Rock': 1.0, 'Jazz': 0.8, 'Classical': 0.7, 'Other': 1.0}.get(data['genre'], 1.0)
        
        final_score = (reach_score * 0.4 + eng_score * 0.3 + rev_score * 0.3) * genre_multiplier
        return max(0, min(100, round(final_score)))

    def generate_insights(self, data, score):
        insights = []
        
        if score >= 75:
            insights.append("Excellent career trajectory! Focus on scaling and professional management.")
        elif score >= 60:
            insights.append("Strong foundation. Prioritize consistent content and audience engagement.")
        elif score >= 45:
            insights.append("Good progress. Work on revenue diversification and live performance.")
        else:
            insights.append("Building phase. Focus on growing audience reach and basic monetization.")
        
        if data['engagement_rate'] < 3:
            insights.append("Improve engagement: Post consistently, use stories, collaborate with influencers.")
        if data['annual_revenue'] < 5000:
            insights.append("Diversify income: Explore merch, Patreon, sync licensing, teaching.")
        if data['gigs_per_year'] < 12:
            insights.append("Increase live shows: Book more gigs to build fanbase and revenue.")
        if data['total_streams'] < 50000:
            insights.append("Grow streaming: Submit to playlists, run ads, cross-promote on social.")
        
        return insights[:4]  # Limit to 4 insights

class SkillAssessmentSerializer(serializers.ModelSerializer):
    # Input fields for quiz answers (0-3 scale)
    quiz_answers = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=3),
        write_only=True,
        required=False,
        allow_empty=False
    )
    
    class Meta:
        model = SkillAssessment
        fields = '__all__'
        read_only_fields = ('user', 'last_updated')

    def create(self, validated_data):
        quiz_answers = validated_data.pop('quiz_answers', [])
        
        # Calculate scores based on quiz answers
        scores = self.calculate_scores(quiz_answers)
        gaps = self.identify_gaps(scores)
        recommendations = self.generate_recommendations(scores, gaps)
        
        # Check if user already has a skill assessment
        user = validated_data.get('user')
        existing_assessment = SkillAssessment.objects.filter(user=user).first()
        
        if existing_assessment:
            # Update existing assessment
            existing_assessment.musical_skill_score = scores['musical']
            existing_assessment.technical_skill_score = scores['technical']
            existing_assessment.business_skill_score = scores['business']
            existing_assessment.skill_gaps = gaps
            existing_assessment.recommended_training = recommendations
            existing_assessment.benchmark_data = {'peer_average': {'musical': 65, 'technical': 60, 'business': 55}}
            existing_assessment.save()
            return existing_assessment
        
        # Create new assessment
        validated_data.update({
            'musical_skill_score': scores['musical'],
            'technical_skill_score': scores['technical'],
            'business_skill_score': scores['business'],
            'skill_gaps': gaps,
            'recommended_training': recommendations,
            'benchmark_data': {'peer_average': {'musical': 65, 'technical': 60, 'business': 55}}
        })
        
        return super().create(validated_data)

    def calculate_scores(self, answers):
        # 12 questions total, map to 3 categories
        # Musical: questions 0,1 (2 questions)
        # Technical: questions 2,3 (2 questions) 
        # Business: questions 4,5,6,7,8,9,10,11 (8 questions)
        
        if len(answers) < 12:
            return {'musical': 0, 'technical': 0, 'business': 0}
        
        # Musical skills (questions 0-1): max 6 points
        musical_total = answers[0] + answers[1]
        musical = min(100, (musical_total / 6) * 100)
        
        # Technical skills (questions 2-3): max 6 points  
        technical_total = answers[2] + answers[3]
        technical = min(100, (technical_total / 6) * 100)
        
        # Business skills (questions 4-11): max 24 points, but weight it appropriately
        business_total = sum(answers[4:12])  # 8 questions
        business = min(100, (business_total / 24) * 100)  # Scale to 0-100
        
        return {'musical': round(musical), 'technical': round(technical), 'business': round(business)}

    def identify_gaps(self, scores):
        gaps = []
        if scores['musical'] < 60: gaps.append('Music Theory & Composition')
        if scores['technical'] < 60: gaps.append('Audio Production & Mixing')
        if scores['business'] < 60: gaps.append('Music Business & Marketing')
        return gaps

    def generate_recommendations(self, scores, gaps):
        recs = []
        for gap in gaps:
            if 'Music Theory' in gap:
                recs.append('Online course: Music Theory Fundamentals')
            if 'Audio Production' in gap:
                recs.append('Tutorial: DAW Mastery with Ableton')
            if 'Business' in gap:
                recs.append('Book: The Music Business Handbook')
        return recs
