#!/bin/bash

# Populate sample census and payer rates data for test facilities
# Oregon Healthcare Portfolio - Bend, Beaverton & Salem

BASE_URL="http://localhost:3000/api/facilities"

# Facility IDs and their beds
BEND_ID="c70b812a-e027-4f62-b40c-6079435fd3d4"
BEND_BEDS=60

BEAVERTON_ID="55ad518a-1473-4149-8278-cb9faffcfc63"
BEAVERTON_BEDS=104

SALEM_ID="f9a3ad1d-9085-4f35-b418-73b67ef48a8e"
SALEM_BEDS=80

echo "=== Populating Payer Rates ==="

# BEND - Payer Rates (Strong Medicare performer, highest quality)
echo "Creating payer rates for BEND TRANSITIONAL CARE..."
curl -s -X POST "$BASE_URL/$BEND_ID/payer-rates" \
  -H "Content-Type: application/json" \
  -d '{
    "effectiveDate": "2025-01-01",
    "medicarePartAPpd": 625.00,
    "medicareAdvantagePpd": 485.00,
    "managedCarePpd": 420.00,
    "medicaidPpd": 205.00,
    "managedMedicaidPpd": 195.00,
    "privatePpd": 315.00,
    "vaContractPpd": 295.00,
    "hospicePpd": 195.00,
    "ancillaryRevenuePpd": 22.00,
    "therapyRevenuePpd": 12.00,
    "source": "sample_data"
  }' | jq -r '.success'

# BEAVERTON - Payer Rates (Larger facility, competitive rates)
echo "Creating payer rates for BEAVERTON..."
curl -s -X POST "$BASE_URL/$BEAVERTON_ID/payer-rates" \
  -H "Content-Type: application/json" \
  -d '{
    "effectiveDate": "2025-01-01",
    "medicarePartAPpd": 610.00,
    "medicareAdvantagePpd": 475.00,
    "managedCarePpd": 405.00,
    "medicaidPpd": 198.00,
    "managedMedicaidPpd": 188.00,
    "privatePpd": 305.00,
    "vaContractPpd": 285.00,
    "hospicePpd": 188.00,
    "ancillaryRevenuePpd": 20.00,
    "therapyRevenuePpd": 10.00,
    "source": "sample_data"
  }' | jq -r '.success'

# SALEM - Payer Rates (3-star, slightly lower rates)
echo "Creating payer rates for SALEM TRANSITIONAL CARE..."
curl -s -X POST "$BASE_URL/$SALEM_ID/payer-rates" \
  -H "Content-Type: application/json" \
  -d '{
    "effectiveDate": "2025-01-01",
    "medicarePartAPpd": 595.00,
    "medicareAdvantagePpd": 460.00,
    "managedCarePpd": 395.00,
    "medicaidPpd": 192.00,
    "managedMedicaidPpd": 182.00,
    "privatePpd": 295.00,
    "vaContractPpd": 275.00,
    "hospicePpd": 182.00,
    "ancillaryRevenuePpd": 18.00,
    "therapyRevenuePpd": 8.00,
    "source": "sample_data"
  }' | jq -r '.success'

echo ""
echo "=== Populating Census Data (TTM) ==="

# BEND - 60 beds, ~85% occupancy, strong skilled mix (5-star)
# Monthly avg census: 60 * 0.85 * 30.5 = 1,556 days/month
echo "Creating TTM census for BEND TRANSITIONAL CARE..."
curl -s -X POST "$BASE_URL/$BEND_ID/census" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "periodStart": "2024-01-01",
      "periodEnd": "2024-01-31",
      "medicarePartADays": 195,
      "medicareAdvantageDays": 140,
      "managedCareDays": 125,
      "medicaidDays": 780,
      "managedMedicaidDays": 100,
      "privateDays": 180,
      "vaContractDays": 20,
      "hospiceDays": 16,
      "otherDays": 0,
      "totalBeds": 60,
      "occupancyRate": 84.2,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-02-01",
      "periodEnd": "2024-02-29",
      "medicarePartADays": 188,
      "medicareAdvantageDays": 138,
      "managedCareDays": 120,
      "medicaidDays": 760,
      "managedMedicaidDays": 98,
      "privateDays": 175,
      "vaContractDays": 18,
      "hospiceDays": 15,
      "otherDays": 0,
      "totalBeds": 60,
      "occupancyRate": 83.1,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-03-01",
      "periodEnd": "2024-03-31",
      "medicarePartADays": 202,
      "medicareAdvantageDays": 145,
      "managedCareDays": 130,
      "medicaidDays": 800,
      "managedMedicaidDays": 105,
      "privateDays": 185,
      "vaContractDays": 22,
      "hospiceDays": 18,
      "otherDays": 0,
      "totalBeds": 60,
      "occupancyRate": 86.5,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-04-01",
      "periodEnd": "2024-04-30",
      "medicarePartADays": 198,
      "medicareAdvantageDays": 142,
      "managedCareDays": 128,
      "medicaidDays": 790,
      "managedMedicaidDays": 102,
      "privateDays": 182,
      "vaContractDays": 21,
      "hospiceDays": 17,
      "otherDays": 0,
      "totalBeds": 60,
      "occupancyRate": 85.8,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-05-01",
      "periodEnd": "2024-05-31",
      "medicarePartADays": 205,
      "medicareAdvantageDays": 148,
      "managedCareDays": 132,
      "medicaidDays": 810,
      "managedMedicaidDays": 108,
      "privateDays": 188,
      "vaContractDays": 23,
      "hospiceDays": 19,
      "otherDays": 0,
      "totalBeds": 60,
      "occupancyRate": 87.9,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-06-01",
      "periodEnd": "2024-06-30",
      "medicarePartADays": 192,
      "medicareAdvantageDays": 140,
      "managedCareDays": 126,
      "medicaidDays": 785,
      "managedMedicaidDays": 100,
      "privateDays": 180,
      "vaContractDays": 20,
      "hospiceDays": 16,
      "otherDays": 0,
      "totalBeds": 60,
      "occupancyRate": 84.6,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-07-01",
      "periodEnd": "2024-07-31",
      "medicarePartADays": 200,
      "medicareAdvantageDays": 145,
      "managedCareDays": 130,
      "medicaidDays": 805,
      "managedMedicaidDays": 105,
      "privateDays": 185,
      "vaContractDays": 22,
      "hospiceDays": 18,
      "otherDays": 0,
      "totalBeds": 60,
      "occupancyRate": 86.8,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-08-01",
      "periodEnd": "2024-08-31",
      "medicarePartADays": 198,
      "medicareAdvantageDays": 143,
      "managedCareDays": 128,
      "medicaidDays": 795,
      "managedMedicaidDays": 103,
      "privateDays": 183,
      "vaContractDays": 21,
      "hospiceDays": 17,
      "otherDays": 0,
      "totalBeds": 60,
      "occupancyRate": 86.1,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-09-01",
      "periodEnd": "2024-09-30",
      "medicarePartADays": 195,
      "medicareAdvantageDays": 141,
      "managedCareDays": 126,
      "medicaidDays": 782,
      "managedMedicaidDays": 101,
      "privateDays": 181,
      "vaContractDays": 20,
      "hospiceDays": 16,
      "otherDays": 0,
      "totalBeds": 60,
      "occupancyRate": 85.2,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-10-01",
      "periodEnd": "2024-10-31",
      "medicarePartADays": 202,
      "medicareAdvantageDays": 146,
      "managedCareDays": 131,
      "medicaidDays": 802,
      "managedMedicaidDays": 106,
      "privateDays": 186,
      "vaContractDays": 22,
      "hospiceDays": 18,
      "otherDays": 0,
      "totalBeds": 60,
      "occupancyRate": 87.0,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-11-01",
      "periodEnd": "2024-11-30",
      "medicarePartADays": 190,
      "medicareAdvantageDays": 138,
      "managedCareDays": 124,
      "medicaidDays": 775,
      "managedMedicaidDays": 99,
      "privateDays": 178,
      "vaContractDays": 19,
      "hospiceDays": 15,
      "otherDays": 0,
      "totalBeds": 60,
      "occupancyRate": 83.8,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-12-01",
      "periodEnd": "2024-12-31",
      "medicarePartADays": 185,
      "medicareAdvantageDays": 135,
      "managedCareDays": 120,
      "medicaidDays": 765,
      "managedMedicaidDays": 96,
      "privateDays": 175,
      "vaContractDays": 18,
      "hospiceDays": 14,
      "otherDays": 0,
      "totalBeds": 60,
      "occupancyRate": 82.2,
      "source": "sample_data"
    }
  ]' | jq -r '.success'

# BEAVERTON - 104 beds, ~82% occupancy, mixed payer (5-star)
# Monthly avg census: 104 * 0.82 * 30.5 = 2,600 days/month
echo "Creating TTM census for BEAVERTON..."
curl -s -X POST "$BASE_URL/$BEAVERTON_ID/census" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "periodStart": "2024-01-01",
      "periodEnd": "2024-01-31",
      "medicarePartADays": 285,
      "medicareAdvantageDays": 210,
      "managedCareDays": 195,
      "medicaidDays": 1380,
      "managedMedicaidDays": 165,
      "privateDays": 310,
      "vaContractDays": 35,
      "hospiceDays": 28,
      "otherDays": 0,
      "totalBeds": 104,
      "occupancyRate": 81.8,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-02-01",
      "periodEnd": "2024-02-29",
      "medicarePartADays": 275,
      "medicareAdvantageDays": 205,
      "managedCareDays": 190,
      "medicaidDays": 1350,
      "managedMedicaidDays": 160,
      "privateDays": 302,
      "vaContractDays": 33,
      "hospiceDays": 26,
      "otherDays": 0,
      "totalBeds": 104,
      "occupancyRate": 80.6,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-03-01",
      "periodEnd": "2024-03-31",
      "medicarePartADays": 295,
      "medicareAdvantageDays": 218,
      "managedCareDays": 202,
      "medicaidDays": 1420,
      "managedMedicaidDays": 172,
      "privateDays": 322,
      "vaContractDays": 38,
      "hospiceDays": 30,
      "otherDays": 0,
      "totalBeds": 104,
      "occupancyRate": 84.5,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-04-01",
      "periodEnd": "2024-04-30",
      "medicarePartADays": 288,
      "medicareAdvantageDays": 212,
      "managedCareDays": 198,
      "medicaidDays": 1395,
      "managedMedicaidDays": 168,
      "privateDays": 315,
      "vaContractDays": 36,
      "hospiceDays": 28,
      "otherDays": 0,
      "totalBeds": 104,
      "occupancyRate": 83.1,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-05-01",
      "periodEnd": "2024-05-31",
      "medicarePartADays": 298,
      "medicareAdvantageDays": 220,
      "managedCareDays": 205,
      "medicaidDays": 1435,
      "managedMedicaidDays": 175,
      "privateDays": 325,
      "vaContractDays": 39,
      "hospiceDays": 31,
      "otherDays": 0,
      "totalBeds": 104,
      "occupancyRate": 85.2,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-06-01",
      "periodEnd": "2024-06-30",
      "medicarePartADays": 280,
      "medicareAdvantageDays": 208,
      "managedCareDays": 192,
      "medicaidDays": 1365,
      "managedMedicaidDays": 162,
      "privateDays": 308,
      "vaContractDays": 34,
      "hospiceDays": 27,
      "otherDays": 0,
      "totalBeds": 104,
      "occupancyRate": 81.2,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-07-01",
      "periodEnd": "2024-07-31",
      "medicarePartADays": 292,
      "medicareAdvantageDays": 215,
      "managedCareDays": 200,
      "medicaidDays": 1410,
      "managedMedicaidDays": 170,
      "privateDays": 320,
      "vaContractDays": 37,
      "hospiceDays": 29,
      "otherDays": 0,
      "totalBeds": 104,
      "occupancyRate": 84.0,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-08-01",
      "periodEnd": "2024-08-31",
      "medicarePartADays": 290,
      "medicareAdvantageDays": 214,
      "managedCareDays": 198,
      "medicaidDays": 1400,
      "managedMedicaidDays": 169,
      "privateDays": 318,
      "vaContractDays": 36,
      "hospiceDays": 29,
      "otherDays": 0,
      "totalBeds": 104,
      "occupancyRate": 83.6,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-09-01",
      "periodEnd": "2024-09-30",
      "medicarePartADays": 284,
      "medicareAdvantageDays": 210,
      "managedCareDays": 194,
      "medicaidDays": 1378,
      "managedMedicaidDays": 165,
      "privateDays": 312,
      "vaContractDays": 35,
      "hospiceDays": 28,
      "otherDays": 0,
      "totalBeds": 104,
      "occupancyRate": 82.5,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-10-01",
      "periodEnd": "2024-10-31",
      "medicarePartADays": 295,
      "medicareAdvantageDays": 218,
      "managedCareDays": 202,
      "medicaidDays": 1425,
      "managedMedicaidDays": 172,
      "privateDays": 322,
      "vaContractDays": 38,
      "hospiceDays": 30,
      "otherDays": 0,
      "totalBeds": 104,
      "occupancyRate": 84.6,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-11-01",
      "periodEnd": "2024-11-30",
      "medicarePartADays": 278,
      "medicareAdvantageDays": 205,
      "managedCareDays": 188,
      "medicaidDays": 1355,
      "managedMedicaidDays": 160,
      "privateDays": 305,
      "vaContractDays": 33,
      "hospiceDays": 26,
      "otherDays": 0,
      "totalBeds": 104,
      "occupancyRate": 80.8,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-12-01",
      "periodEnd": "2024-12-31",
      "medicarePartADays": 270,
      "medicareAdvantageDays": 200,
      "managedCareDays": 182,
      "medicaidDays": 1335,
      "managedMedicaidDays": 155,
      "privateDays": 298,
      "vaContractDays": 32,
      "hospiceDays": 25,
      "otherDays": 0,
      "totalBeds": 104,
      "occupancyRate": 78.5,
      "source": "sample_data"
    }
  ]' | jq -r '.success'

# SALEM - 80 beds, ~78% occupancy, higher Medicaid (3-star)
# Monthly avg census: 80 * 0.78 * 30.5 = 1,903 days/month
echo "Creating TTM census for SALEM TRANSITIONAL CARE..."
curl -s -X POST "$BASE_URL/$SALEM_ID/census" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "periodStart": "2024-01-01",
      "periodEnd": "2024-01-31",
      "medicarePartADays": 165,
      "medicareAdvantageDays": 120,
      "managedCareDays": 105,
      "medicaidDays": 1080,
      "managedMedicaidDays": 145,
      "privateDays": 230,
      "vaContractDays": 28,
      "hospiceDays": 22,
      "otherDays": 0,
      "totalBeds": 80,
      "occupancyRate": 77.5,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-02-01",
      "periodEnd": "2024-02-29",
      "medicarePartADays": 158,
      "medicareAdvantageDays": 116,
      "managedCareDays": 100,
      "medicaidDays": 1055,
      "managedMedicaidDays": 140,
      "privateDays": 222,
      "vaContractDays": 26,
      "hospiceDays": 20,
      "otherDays": 0,
      "totalBeds": 80,
      "occupancyRate": 75.8,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-03-01",
      "periodEnd": "2024-03-31",
      "medicarePartADays": 172,
      "medicareAdvantageDays": 126,
      "managedCareDays": 110,
      "medicaidDays": 1105,
      "managedMedicaidDays": 152,
      "privateDays": 240,
      "vaContractDays": 30,
      "hospiceDays": 24,
      "otherDays": 0,
      "totalBeds": 80,
      "occupancyRate": 79.8,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-04-01",
      "periodEnd": "2024-04-30",
      "medicarePartADays": 168,
      "medicareAdvantageDays": 122,
      "managedCareDays": 107,
      "medicaidDays": 1088,
      "managedMedicaidDays": 148,
      "privateDays": 235,
      "vaContractDays": 29,
      "hospiceDays": 23,
      "otherDays": 0,
      "totalBeds": 80,
      "occupancyRate": 78.5,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-05-01",
      "periodEnd": "2024-05-31",
      "medicarePartADays": 175,
      "medicareAdvantageDays": 128,
      "managedCareDays": 112,
      "medicaidDays": 1115,
      "managedMedicaidDays": 155,
      "privateDays": 242,
      "vaContractDays": 31,
      "hospiceDays": 25,
      "otherDays": 0,
      "totalBeds": 80,
      "occupancyRate": 80.5,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-06-01",
      "periodEnd": "2024-06-30",
      "medicarePartADays": 162,
      "medicareAdvantageDays": 118,
      "managedCareDays": 103,
      "medicaidDays": 1070,
      "managedMedicaidDays": 142,
      "privateDays": 228,
      "vaContractDays": 27,
      "hospiceDays": 21,
      "otherDays": 0,
      "totalBeds": 80,
      "occupancyRate": 76.8,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-07-01",
      "periodEnd": "2024-07-31",
      "medicarePartADays": 170,
      "medicareAdvantageDays": 124,
      "managedCareDays": 109,
      "medicaidDays": 1098,
      "managedMedicaidDays": 150,
      "privateDays": 238,
      "vaContractDays": 29,
      "hospiceDays": 23,
      "otherDays": 0,
      "totalBeds": 80,
      "occupancyRate": 79.2,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-08-01",
      "periodEnd": "2024-08-31",
      "medicarePartADays": 168,
      "medicareAdvantageDays": 122,
      "managedCareDays": 107,
      "medicaidDays": 1090,
      "managedMedicaidDays": 148,
      "privateDays": 235,
      "vaContractDays": 29,
      "hospiceDays": 23,
      "otherDays": 0,
      "totalBeds": 80,
      "occupancyRate": 78.6,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-09-01",
      "periodEnd": "2024-09-30",
      "medicarePartADays": 165,
      "medicareAdvantageDays": 120,
      "managedCareDays": 105,
      "medicaidDays": 1078,
      "managedMedicaidDays": 145,
      "privateDays": 232,
      "vaContractDays": 28,
      "hospiceDays": 22,
      "otherDays": 0,
      "totalBeds": 80,
      "occupancyRate": 77.8,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-10-01",
      "periodEnd": "2024-10-31",
      "medicarePartADays": 172,
      "medicareAdvantageDays": 125,
      "managedCareDays": 110,
      "medicaidDays": 1102,
      "managedMedicaidDays": 152,
      "privateDays": 240,
      "vaContractDays": 30,
      "hospiceDays": 24,
      "otherDays": 0,
      "totalBeds": 80,
      "occupancyRate": 79.6,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-11-01",
      "periodEnd": "2024-11-30",
      "medicarePartADays": 158,
      "medicareAdvantageDays": 115,
      "managedCareDays": 100,
      "medicaidDays": 1050,
      "managedMedicaidDays": 138,
      "privateDays": 225,
      "vaContractDays": 26,
      "hospiceDays": 20,
      "otherDays": 0,
      "totalBeds": 80,
      "occupancyRate": 75.5,
      "source": "sample_data"
    },
    {
      "periodStart": "2024-12-01",
      "periodEnd": "2024-12-31",
      "medicarePartADays": 152,
      "medicareAdvantageDays": 112,
      "managedCareDays": 95,
      "medicaidDays": 1030,
      "managedMedicaidDays": 135,
      "privateDays": 218,
      "vaContractDays": 25,
      "hospiceDays": 18,
      "otherDays": 0,
      "totalBeds": 80,
      "occupancyRate": 73.2,
      "source": "sample_data"
    }
  ]' | jq -r '.success'

echo ""
echo "=== Data Population Complete ==="
echo ""
echo "Verifying data..."

# Verify census data
echo "BEND census periods:"
curl -s "$BASE_URL/$BEND_ID/census" | jq '.data.censusPeriods | length'

echo "BEAVERTON census periods:"
curl -s "$BASE_URL/$BEAVERTON_ID/census" | jq '.data.censusPeriods | length'

echo "SALEM census periods:"
curl -s "$BASE_URL/$SALEM_ID/census" | jq '.data.censusPeriods | length'

# Verify payer rates
echo ""
echo "Payer rates created:"
curl -s "$BASE_URL/$BEND_ID/payer-rates" | jq '.data.currentRates.medicarePartAPpd'
curl -s "$BASE_URL/$BEAVERTON_ID/payer-rates" | jq '.data.currentRates.medicarePartAPpd'
curl -s "$BASE_URL/$SALEM_ID/payer-rates" | jq '.data.currentRates.medicarePartAPpd'

echo ""
echo "Done! Refresh the deal page to see the updated financial data."
