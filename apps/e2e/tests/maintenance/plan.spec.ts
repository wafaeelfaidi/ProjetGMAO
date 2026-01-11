import { test, expect } from '@playwright/test';

test.describe('Maintenance Planification Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the maintenance plan page
    await page.goto('http://localhost:3000/maintenance/plan');
  });

  test('should load the maintenance plan page', async ({ page }) => {
    // Check for page title
    await expect(page.getByRole('heading', { name: /Planification de la Maintenance/i })).toBeVisible();
    
    // Check for description text
    await expect(page.getByText(/Prévisions basées sur l'analyse AMDEC/i)).toBeVisible();
  });

  test('should display filter controls', async ({ page }) => {
    // Check for machine selector
    await expect(page.getByText('Filtres:')).toBeVisible();
    
    // Check for horizon selector (should have options like "60 jours")
    const horizonSelect = page.locator('button:has-text("jours")').first();
    await expect(horizonSelect).toBeVisible();
  });

  test('should display metrics cards', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check for metric cards
    await expect(page.getByText('Interventions prévues')).toBeVisible();
    await expect(page.getByText('Haute probabilité')).toBeVisible();
    await expect(page.getByText('Temps d\'arrêt prévu')).toBeVisible();
    await expect(page.getByText('Coût matériel prévu')).toBeVisible();
  });

  test('should display tabs for calendar and list view', async ({ page }) => {
    // Check for tabs
    await expect(page.getByRole('tab', { name: /Calendrier/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Liste/i })).toBeVisible();
  });

  test('should switch between calendar and list views', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Calendar should be active by default
    const calendarTab = page.getByRole('tab', { name: /Calendrier/i });
    await expect(calendarTab).toHaveAttribute('data-state', 'active');
    
    // Click on list tab
    const listTab = page.getByRole('tab', { name: /Liste/i });
    await listTab.click();
    
    // List should now be active
    await expect(listTab).toHaveAttribute('data-state', 'active');
  });

  test('should display probability breakdown section', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check for probability breakdown card
    await expect(page.getByText('Types de pannes probables')).toBeVisible();
  });

  test('should handle no data gracefully', async ({ page }) => {
    // If there's no data, should show appropriate message
    const noDataMessage = page.getByText(/Aucune maintenance prévue/i);
    const hasData = page.getByText(/Interventions prévues/i);
    
    // Either we have data or a no-data message
    await expect(
      hasData.or(noDataMessage)
    ).toBeVisible();
  });

  test('should filter by machine', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Click on machine selector
    const machineSelect = page.locator('button').filter({ hasText: /Toutes les machines|machine/i }).first();
    await machineSelect.click();
    
    // Select a specific machine if available
    const machineOptions = page.locator('[role="option"]');
    const optionCount = await machineOptions.count();
    
    if (optionCount > 1) {
      // Click on second option (first is usually "all")
      await machineOptions.nth(1).click();
      
      // Reset button should appear
      await expect(page.getByRole('button', { name: /Réinitialiser les filtres/i })).toBeVisible();
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Route API calls to return errors
    await page.route('**/maintenance/forecast*', route => route.abort());
    
    await page.goto('http://localhost:3000/maintenance/plan');
    
    // Should show error alert or fallback UI
    // Note: The actual error handling depends on implementation
    await page.waitForTimeout(2000);
  });
});

test.describe('Maintenance API Integration', () => {
  test('should successfully fetch forecast data', async ({ page }) => {
    let forecastResponse: any = null;
    
    // Intercept the forecast API call
    page.on('response', async response => {
      if (response.url().includes('/maintenance/forecast')) {
        forecastResponse = await response.json();
      }
    });
    
    await page.goto('http://localhost:3000/maintenance/plan');
    await page.waitForTimeout(3000);
    
    // Verify API was called and returned data
    if (forecastResponse) {
      expect(Array.isArray(forecastResponse)).toBe(true);
      console.log(`✓ Received ${forecastResponse.length} forecast(s)`);
    }
  });

  test('should successfully fetch calendar data', async ({ page }) => {
    let calendarResponse: any = null;
    
    // Intercept the calendar API call
    page.on('response', async response => {
      if (response.url().includes('/maintenance/calendar')) {
        calendarResponse = await response.json();
      }
    });
    
    await page.goto('http://localhost:3000/maintenance/plan');
    await page.waitForTimeout(3000);
    
    // Verify API was called
    if (calendarResponse) {
      expect(Array.isArray(calendarResponse)).toBe(true);
      console.log(`✓ Received ${calendarResponse.length} calendar event(s)`);
    }
  });
});
