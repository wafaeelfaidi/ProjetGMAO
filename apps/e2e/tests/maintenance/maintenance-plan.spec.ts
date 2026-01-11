import { test, expect } from '@playwright/test';

test.describe('Maintenance Plan Page', () => {
  test('should render the maintenance plan page', async ({ page }) => {
    // Navigate to the maintenance plan page
    await page.goto('http://localhost:3000/home/maintenance/plan');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the main heading is visible
    await expect(page.getByText('Planification de la Maintenance')).toBeVisible();

    // Check that filters are present
    await expect(page.getByText('Filtres:')).toBeVisible();

    // Check that metrics cards are present
    await expect(page.getByText('Interventions prévues')).toBeVisible();
    await expect(page.getByText('Haute probabilité')).toBeVisible();
    await expect(page.getByText('Temps d\'arrêt prévu')).toBeVisible();
    await expect(page.getByText('Coût matériel prévu')).toBeVisible();

    // Check that tabs are present
    await expect(page.getByRole('tab', { name: /calendrier/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /liste/i })).toBeVisible();
  });

  test('should be able to filter by machine', async ({ page }) => {
    await page.goto('http://localhost:3000/home/maintenance/plan');
    await page.waitForLoadState('networkidle');

    // Find and click the machine selector
    const machineSelect = page.locator('button:has-text("Toutes les machines"), button:has-text("machine")').first();
    
    if (await machineSelect.isVisible()) {
      await machineSelect.click();
      
      // Wait for dropdown to appear
      await page.waitForTimeout(500);
      
      // Check that options are available (if machines exist in data)
      const options = page.locator('[role="option"]');
      const count = await options.count();
      
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should switch between calendar and list views', async ({ page }) => {
    await page.goto('http://localhost:3000/home/maintenance/plan');
    await page.waitForLoadState('networkidle');

    // Click on list tab
    const listTab = page.getByRole('tab', { name: /liste/i });
    await listTab.click();

    // Check that list view is active
    await expect(listTab).toHaveAttribute('data-state', 'active');

    // Click back on calendar tab
    const calendarTab = page.getByRole('tab', { name: /calendrier/i });
    await calendarTab.click();

    // Check that calendar view is active
    await expect(calendarTab).toHaveAttribute('data-state', 'active');
  });
});
