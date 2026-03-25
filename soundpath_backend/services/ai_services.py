import requests
from django.conf import settings
from apps.ai_engine.models import CareerAnalysis, SkillAssessment, CareerRoadmap, Milestone
from apps.communication.models import ChatMessage
from apps.matching.models import CollaborationMatch

def trigger_ml_analysis(user_id):
    """
    Collects data from UserProfile and UserMetricsUpload, 
    prepares JSON for the external FastAPI ML engine.
    """
    # Placeholder for collecting data and hitting FastAPI
    # response = requests.post(f"{settings.ML_URL}/predict", json=data)
    print(f"Triggering ML Analysis for user {user_id}")
    return {"status": "processing"}

def trigger_llm_advisor(user, session_id, user_message):
    """
    Fetches context from UserProfile and CareerAnalysis to build a system prompt,
    then interacts with the LLM API (Claude/GPT-4).
    """
    profile = getattr(user, 'profile', None)
    analysis = getattr(user, 'career_analysis', None)
    
    context = f"Artist: {user.artist_name}. Bio: {user.bio}."
    if profile:
        context += f" Genre: {profile.genre}. Stage: {profile.career_stage}."
    if analysis:
        context += f" Career Score: {analysis.career_score}."

    # Placeholder for LLM API call
    ai_response = f"Hello {user.username}, based on your {profile.genre if profile else 'music'} profile, I recommend focusing on..."
    
    # Save to ChatMessage
    from apps.communication.models import ChatSession
    session = ChatSession.objects.get(id=session_id)
    ChatMessage.objects.create(session=session, role='assistant', content=ai_response)
    
    return ai_response

def generate_roadmap(user_id):
    """
    Calls LLM/ML to create or update CareerRoadmap and Milestones.
    """
    print(f"Generating roadmap for user {user_id}")
    # Placeholder logic to create CareerRoadmap and Milestones
    return {"status": "created"}

def run_neural_matcher(user_id):
    """
    Queries other user profiles and runs compatibility algorithm.
    """
    print(f"Running neural matcher for user {user_id}")
    # Placeholder logic to create CollaborationMatch objects
    return {"status": "matching_complete"}
