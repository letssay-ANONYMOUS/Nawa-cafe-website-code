

# Plan: Track Customer IP Address and Location for Kitchen Dashboard

## Overview

Capture each customer's IP address and approximate location (city/country) when they place an order, and display this information in the kitchen dashboard so staff can identify which branch (main or Al Ain) the customer is near.

## How It Works

1. When a customer submits their order at checkout, the `create-ziina-checkout` edge function already runs server-side -- this is where we capture the IP address from request headers
2. A free IP geolocation API (ip-api.com) resolves the IP to a human-readable city and country
3. The IP address and location are saved directly on the `orders` table
4. The kitchen dashboard displays this info on every order row and in the expanded details

## Step 1: Add Columns to Orders Table

Add two new columns to the `orders` table via migration:

- `ip_address` (text, nullable) -- raw IP address
- `customer_location` (text, nullable) -- human-readable location like "Abu Dhabi, AE" or "Al Ain, AE"

## Step 2: Update `create-ziina-checkout` Edge Function

When an order is created, the edge function will:

1. Extract the customer's IP from request headers (`cf-connecting-ip`, `x-forwarded-for`, `x-real-ip`)
2. Call `http://ip-api.com/json/{ip}` (free, no API key needed) to get city and country
3. Build a location string like "Al Ain, United Arab Emirates"
4. Save both `ip_address` and `customer_location` on the order row during the existing INSERT

## Step 3: Display in Kitchen Dashboard Order Table

In the `OrderTable` component:

- Add a new "Location" column in the table header (visible on medium+ screens)
- Show the `customer_location` value (e.g., "Al Ain, AE") in each order row
- In the expanded order details section, show both:
  - IP Address (e.g., `85.115.x.x`)
  - Location (e.g., "Al Ain, United Arab Emirates")
- Use a `MapPin` icon from lucide-react for visual clarity

## What This Looks Like in the Kitchen

**Table row** (collapsed):
```text
Date/Time | Order # | Customer | Phone | Location      | Items | Total | Action
10:32 AM  | NAWA-.. | Ahmed    | +971..| Al Ain, AE    |   3   | 85.00 | ACK
```

**Expanded details** will show:
```text
IP Address: 85.115.42.xxx
Location:   Al Ain, United Arab Emirates
```

## Technical Details

- **IP Geolocation**: Uses ip-api.com (free tier, 45 requests/minute, no key needed). Plenty for a cafe.
- **No new edge functions** -- all logic added to the existing `create-ziina-checkout` function
- **No new tables** -- just two new nullable columns on `orders`
- **Fallback**: If geolocation fails, the IP is still saved and location shows "Unknown"
- The `admin-orders` edge function already returns `SELECT *` from orders, so the new columns will automatically be available to the kitchen dashboard without changes to that function

