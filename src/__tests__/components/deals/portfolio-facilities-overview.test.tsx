import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PortfolioFacilitiesOverview } from '@/components/deals/portfolio-facilities-overview';

// Mock facility data
const mockFacilities = [
  {
    id: '1',
    name: 'Valley Care Center',
    beds: 120,
    occupancy: 0.85,
    ebitda: 1200000,
    cmsRating: 4,
    healthRating: 4,
    staffingRating: 3,
    qualityRating: 4,
    isSff: false,
  },
  {
    id: '2',
    name: 'Mountain View SNF',
    beds: 100,
    occupancy: 0.78,
    ebitda: 800000,
    cmsRating: 3,
    healthRating: 3,
    staffingRating: 3,
    qualityRating: 3,
    isSff: false,
  },
  {
    id: '3',
    name: 'Sunrise Healthcare',
    beds: 80,
    occupancy: 0.92,
    ebitda: 500000,
    cmsRating: 2,
    healthRating: 2,
    staffingRating: 2,
    qualityRating: 2,
    isSff: true,
  },
];

describe('PortfolioFacilitiesOverview', () => {
  describe('Portfolio Summary', () => {
    it('should render portfolio summary card', () => {
      render(<PortfolioFacilitiesOverview facilities={mockFacilities} />);

      expect(screen.getByText('Portfolio Summary')).toBeInTheDocument();
    });

    it('should calculate total beds correctly', () => {
      render(<PortfolioFacilitiesOverview facilities={mockFacilities} />);

      // Total beds = 120 + 100 + 80 = 300
      // Use getAllByText since 300 appears multiple times (summary + footer)
      const totalBedsElements = screen.getAllByText('300');
      expect(totalBedsElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should display facility count and total beds in description', () => {
      render(<PortfolioFacilitiesOverview facilities={mockFacilities} />);

      expect(screen.getByText('3 facilities · 300 total beds')).toBeInTheDocument();
    });

    it('should show SFF badge when portfolio has SFF facility', () => {
      render(<PortfolioFacilitiesOverview facilities={mockFacilities} />);

      // The SFF badge in the header
      expect(screen.getByText('SFF Facility')).toBeInTheDocument();
    });

    it('should not show SFF badge when no SFF facilities', () => {
      const nonSffFacilities = mockFacilities.map(f => ({ ...f, isSff: false }));
      render(<PortfolioFacilitiesOverview facilities={nonSffFacilities} />);

      expect(screen.queryByText('SFF Facility')).not.toBeInTheDocument();
    });
  });

  describe('Facilities Breakdown Table', () => {
    it('should render facilities breakdown card', () => {
      render(<PortfolioFacilitiesOverview facilities={mockFacilities} />);

      expect(screen.getByText('Facilities Breakdown')).toBeInTheDocument();
    });

    it('should display all facility names', () => {
      render(<PortfolioFacilitiesOverview facilities={mockFacilities} />);

      expect(screen.getByText('Valley Care Center')).toBeInTheDocument();
      expect(screen.getByText('Mountain View SNF')).toBeInTheDocument();
      expect(screen.getByText('Sunrise Healthcare')).toBeInTheDocument();
    });

    it('should display table headers', () => {
      render(<PortfolioFacilitiesOverview facilities={mockFacilities} />);

      expect(screen.getByText('Facility')).toBeInTheDocument();
      expect(screen.getByText('Beds')).toBeInTheDocument();
      expect(screen.getByText('Occupancy')).toBeInTheDocument();
      expect(screen.getByText('EBITDA')).toBeInTheDocument();
      expect(screen.getByText('CMS Rating')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should show SFF badge next to SFF facilities', () => {
      render(<PortfolioFacilitiesOverview facilities={mockFacilities} />);

      // There should be at least one "SFF" badge in the table
      const sffBadges = screen.getAllByText('SFF');
      expect(sffBadges.length).toBeGreaterThanOrEqual(1);
    });

    it('should display portfolio total row', () => {
      render(<PortfolioFacilitiesOverview facilities={mockFacilities} />);

      expect(screen.getByText('Portfolio Total')).toBeInTheDocument();
    });
  });

  describe('Status Badges', () => {
    it('should show Strong badge for rating >= 4', () => {
      render(<PortfolioFacilitiesOverview facilities={mockFacilities} />);

      expect(screen.getByText('Strong')).toBeInTheDocument();
    });

    it('should show Average badge for rating 3', () => {
      render(<PortfolioFacilitiesOverview facilities={mockFacilities} />);

      expect(screen.getByText('Average')).toBeInTheDocument();
    });

    it('should show At Risk badge for rating < 3', () => {
      render(<PortfolioFacilitiesOverview facilities={mockFacilities} />);

      expect(screen.getByText('At Risk')).toBeInTheDocument();
    });

    it('should show Pending badge for null CMS rating', () => {
      const facilitiesWithNull = [
        { ...mockFacilities[0], cmsRating: null }
      ];
      render(<PortfolioFacilitiesOverview facilities={facilitiesWithNull} />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  describe('Optional Portfolio Metrics', () => {
    it('should display portfolio revenue when provided', () => {
      render(
        <PortfolioFacilitiesOverview
          facilities={mockFacilities}
          portfolioRevenue={10000000}
        />
      );

      expect(screen.getByText('Portfolio Revenue')).toBeInTheDocument();
      expect(screen.getByText('$10.0M')).toBeInTheDocument();
    });

    it('should display portfolio NOI when provided', () => {
      render(
        <PortfolioFacilitiesOverview
          facilities={mockFacilities}
          portfolioNoi={2500000}
        />
      );

      expect(screen.getByText('Portfolio NOI')).toBeInTheDocument();
      // The component uses formatCurrency which rounds to nearest million
      const noiValues = screen.getAllByText(/\$2\.5M/);
      expect(noiValues.length).toBeGreaterThanOrEqual(1);
    });

    it('should not display revenue/NOI section when not provided', () => {
      render(<PortfolioFacilitiesOverview facilities={mockFacilities} />);

      expect(screen.queryByText('Portfolio Revenue')).not.toBeInTheDocument();
      expect(screen.queryByText('Portfolio NOI')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should handle empty facilities array', () => {
      render(<PortfolioFacilitiesOverview facilities={[]} />);

      expect(screen.getByText('0 facilities · 0 total beds')).toBeInTheDocument();
    });
  });

  describe('Occupancy Colors', () => {
    it('should apply green color for high occupancy (>=85%)', () => {
      const highOccFacility = [{ ...mockFacilities[0], occupancy: 0.90 }];
      render(<PortfolioFacilitiesOverview facilities={highOccFacility} />);

      // Find the occupancy text within the table (there may be multiple 90.0% instances)
      const occupancyCells = screen.getAllByText('90.0%');
      // At least one should have the green class
      const hasGreen = occupancyCells.some((cell) =>
        cell.classList.contains('text-green-600')
      );
      expect(hasGreen).toBe(true);
    });

    it('should apply amber color for medium occupancy (75-85%)', () => {
      const medOccFacility = [{ ...mockFacilities[0], occupancy: 0.80 }];
      render(<PortfolioFacilitiesOverview facilities={medOccFacility} />);

      const occupancyCells = screen.getAllByText('80.0%');
      const hasAmber = occupancyCells.some((cell) =>
        cell.classList.contains('text-amber-600')
      );
      expect(hasAmber).toBe(true);
    });

    it('should apply red color for low occupancy (<75%)', () => {
      const lowOccFacility = [{ ...mockFacilities[0], occupancy: 0.65 }];
      render(<PortfolioFacilitiesOverview facilities={lowOccFacility} />);

      const occupancyCells = screen.getAllByText('65.0%');
      const hasRed = occupancyCells.some((cell) =>
        cell.classList.contains('text-red-600')
      );
      expect(hasRed).toBe(true);
    });
  });

  describe('Data Formatting', () => {
    it('should format EBITDA in millions', () => {
      render(<PortfolioFacilitiesOverview facilities={mockFacilities} />);

      // Valley Care: $1.2M
      expect(screen.getByText('$1.2M')).toBeInTheDocument();
    });

    it('should format EBITDA in thousands', () => {
      const smallEbitda = [{ ...mockFacilities[0], ebitda: 500000 }];
      render(<PortfolioFacilitiesOverview facilities={smallEbitda} />);

      // May have multiple $500K values (facility row + portfolio total)
      const ebitdaValues = screen.getAllByText('$500K');
      expect(ebitdaValues.length).toBeGreaterThanOrEqual(1);
    });

    it('should display dash for missing EBITDA', () => {
      const noEbitda = [{ ...mockFacilities[0], ebitda: undefined }];
      render(<PortfolioFacilitiesOverview facilities={noEbitda} />);

      // Multiple dashes may be present for missing values
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it('should display dash for zero EBITDA', () => {
      const zeroEbitda = [{ ...mockFacilities[0], ebitda: 0 }];
      render(<PortfolioFacilitiesOverview facilities={zeroEbitda} />);

      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThan(0);
    });
  });
});
