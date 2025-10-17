#!/usr/bin/env python3
"""
Quick test script to verify the Flask server is working correctly
"""

import requests
import json

BASE_URL = "http://localhost:5000"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✓ Health check passed")
            print(f"  Status: {data['status']}")
            print(f"  Database: {data['database']}")
            print(f"  OAuth Configured: {data['sender_configured']}")
            return True
        else:
            print(f"✗ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to server. Is it running on port 5000?")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_signup():
    """Test signup endpoint"""
    try:
        test_email = f"test_{int(requests.get('http://worldtimeapi.org/api/timezone/Etc/UTC').json()['unixtime'])}@test.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "email": test_email,
                "password": "testpass123",
                "businessName": "Test Business"
            },
            timeout=5
        )
        if response.status_code == 201:
            data = response.json()
            print("✓ Signup test passed")
            print(f"  User created: {data['user']['email']}")
            return True, response.cookies
        else:
            print(f"✗ Signup failed: {response.status_code}")
            return False, None
    except Exception as e:
        print(f"✗ Signup error: {e}")
        return False, None

def test_me(cookies):
    """Test get current user endpoint"""
    try:
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            cookies=cookies,
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            print("✓ Get current user test passed")
            print(f"  User: {data['user']['email']}")
            return True
        else:
            print(f"✗ Get user failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Get user error: {e}")
        return False

def test_customers(cookies):
    """Test customers endpoint"""
    try:
        response = requests.get(
            f"{BASE_URL}/api/customers",
            cookies=cookies,
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            print("✓ Get customers test passed")
            print(f"  Customers count: {len(data)}")
            return True
        else:
            print(f"✗ Get customers failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Get customers error: {e}")
        return False

def main():
    print("=" * 60)
    print("  🧪 TESTING CRM SERVER")
    print("=" * 60)
    print()

    # Test 1: Health
    print("Test 1: Health Check")
    if not test_health():
        print("\n❌ Server is not running or not responding!")
        print("   Please start the server: python server.py")
        return
    print()

    # Test 2: Signup
    print("Test 2: User Signup")
    success, cookies = test_signup()
    if not success:
        print("\n❌ Signup test failed!")
        return
    print()

    # Test 3: Get current user
    print("Test 3: Get Current User")
    if not test_me(cookies):
        print("\n❌ Get user test failed!")
        return
    print()

    # Test 4: Get customers
    print("Test 4: Get Customers")
    if not test_customers(cookies):
        print("\n❌ Get customers test failed!")
        return
    print()

    print("=" * 60)
    print("  ✅ ALL TESTS PASSED!")
    print("=" * 60)
    print()
    print("Server is working correctly!")
    print("You can now start the frontend: npm run dev")

if __name__ == "__main__":
    main()
