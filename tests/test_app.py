"""
Tests for the FastAPI application endpoints
"""

import pytest
from fastapi.testclient import TestClient
from src.app import app, activities


@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_activities():
    """Reset activities to initial state before each test"""
    # Store original state
    original_activities = {
        name: {
            "description": activity["description"],
            "schedule": activity["schedule"],
            "max_participants": activity["max_participants"],
            "participants": activity["participants"].copy()
        }
        for name, activity in activities.items()
    }
    
    yield
    
    # Restore original state after test
    for name, activity in original_activities.items():
        if name in activities:
            activities[name]["participants"] = activity["participants"].copy()


class TestRootEndpoint:
    """Tests for the root endpoint"""
    
    def test_root_redirects_to_static(self, client):
        """Test that root path redirects to static index.html"""
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 307
        assert response.headers["location"] == "/static/index.html"


class TestGetActivities:
    """Tests for the GET /activities endpoint"""
    
    def test_get_activities_returns_all_activities(self, client):
        """Test that GET /activities returns all activities"""
        response = client.get("/activities")
        assert response.status_code == 200
        data = response.json()
        
        # Verify it's a dictionary
        assert isinstance(data, dict)
        
        # Verify some expected activities are present
        assert "Soccer Team" in data
        assert "Chess Club" in data
        assert "Programming Class" in data
        
    def test_get_activities_structure(self, client):
        """Test that activity data has correct structure"""
        response = client.get("/activities")
        data = response.json()
        
        # Check one activity has all expected fields
        soccer = data["Soccer Team"]
        assert "description" in soccer
        assert "schedule" in soccer
        assert "max_participants" in soccer
        assert "participants" in soccer
        assert isinstance(soccer["participants"], list)


class TestSignupForActivity:
    """Tests for the POST /activities/{activity_name}/signup endpoint"""
    
    def test_signup_for_existing_activity(self, client):
        """Test signing up for an existing activity"""
        response = client.post(
            "/activities/Chess Club/signup",
            params={"email": "newstudent@mergington.edu"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "newstudent@mergington.edu" in data["message"]
        assert "Chess Club" in data["message"]
        
        # Verify student was added to participants
        assert "newstudent@mergington.edu" in activities["Chess Club"]["participants"]
    
    def test_signup_for_nonexistent_activity(self, client):
        """Test signing up for an activity that doesn't exist"""
        response = client.post(
            "/activities/Nonexistent Activity/signup",
            params={"email": "student@mergington.edu"}
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "Activity not found" in data["detail"]
    
    def test_signup_when_already_registered(self, client):
        """Test signing up when already registered for the activity"""
        # First signup
        client.post(
            "/activities/Chess Club/signup",
            params={"email": "duplicate@mergington.edu"}
        )
        
        # Try to signup again
        response = client.post(
            "/activities/Chess Club/signup",
            params={"email": "duplicate@mergington.edu"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "already signed up" in data["detail"].lower()
    
    def test_signup_multiple_students(self, client):
        """Test that multiple students can sign up for same activity"""
        emails = [
            "student1@mergington.edu",
            "student2@mergington.edu",
            "student3@mergington.edu"
        ]
        
        for email in emails:
            response = client.post(
                "/activities/Drama Club/signup",
                params={"email": email}
            )
            assert response.status_code == 200
        
        # Verify all students were added
        for email in emails:
            assert email in activities["Drama Club"]["participants"]


class TestUnregisterFromActivity:
    """Tests for the DELETE /activities/{activity_name}/unregister endpoint"""
    
    def test_unregister_from_activity(self, client):
        """Test unregistering from an activity"""
        # First signup
        email = "unregister@mergington.edu"
        client.post(
            "/activities/Programming Class/signup",
            params={"email": email}
        )
        
        # Then unregister
        response = client.delete(
            "/activities/Programming Class/unregister",
            params={"email": email}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert email in data["message"]
        assert "Programming Class" in data["message"]
        
        # Verify student was removed
        assert email not in activities["Programming Class"]["participants"]
    
    def test_unregister_from_nonexistent_activity(self, client):
        """Test unregistering from an activity that doesn't exist"""
        response = client.delete(
            "/activities/Nonexistent Activity/unregister",
            params={"email": "student@mergington.edu"}
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "Activity not found" in data["detail"]
    
    def test_unregister_when_not_registered(self, client):
        """Test unregistering when not registered for the activity"""
        response = client.delete(
            "/activities/Swimming Club/unregister",
            params={"email": "notregistered@mergington.edu"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "not signed up" in data["detail"].lower()
    
    def test_unregister_existing_participant(self, client):
        """Test unregistering an existing participant"""
        # Use an existing participant from the initial data
        email = "james@mergington.edu"
        
        # Verify they are initially registered
        assert email in activities["Soccer Team"]["participants"]
        
        # Unregister
        response = client.delete(
            "/activities/Soccer Team/unregister",
            params={"email": email}
        )
        assert response.status_code == 200
        
        # Verify they were removed
        assert email not in activities["Soccer Team"]["participants"]


class TestSignupAndUnregisterFlow:
    """Integration tests for signup and unregister flow"""
    
    def test_complete_signup_unregister_flow(self, client):
        """Test complete flow of signing up and unregistering"""
        email = "flowtest@mergington.edu"
        activity = "Art Studio"
        
        # Verify not initially registered
        assert email not in activities[activity]["participants"]
        
        # Sign up
        signup_response = client.post(
            f"/activities/{activity}/signup",
            params={"email": email}
        )
        assert signup_response.status_code == 200
        assert email in activities[activity]["participants"]
        
        # Unregister
        unregister_response = client.delete(
            f"/activities/{activity}/unregister",
            params={"email": email}
        )
        assert unregister_response.status_code == 200
        assert email not in activities[activity]["participants"]
    
    def test_signup_for_multiple_activities(self, client):
        """Test that a student can sign up for multiple activities"""
        email = "multisport@mergington.edu"
        activities_list = ["Soccer Team", "Swimming Club", "Gym Class"]
        
        for activity in activities_list:
            response = client.post(
                f"/activities/{activity}/signup",
                params={"email": email}
            )
            assert response.status_code == 200
        
        # Verify student is in all activities
        for activity in activities_list:
            assert email in activities[activity]["participants"]
