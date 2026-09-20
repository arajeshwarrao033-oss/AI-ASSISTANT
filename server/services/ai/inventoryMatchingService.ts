import { db } from '../../db/database';
import { InventoryItem, ExtractedLineItem } from '../../../src/types/accounting';

export interface InventoryMatchResult {
  matchedItem?: InventoryItem;
  confidence: number;
  isNewRecommended: boolean;
  recommendedItem?: {
    name: string;
    sku: string;
    hsn: string;
    unit: string;
    stockGroup: string;
    gstRate: number;
    purchaseRate: number;
  };
  reason: string;
}

export class InventoryMatchingService {
  matchLineItem(companyId: string, item: ExtractedLineItem): InventoryMatchResult {
    const inventory = db.getInventory(companyId);
    const desc = item.description.value.trim().toLowerCase();
    const itemSku = item.sku?.value?.trim().toLowerCase();
    const itemHsn = item.hsnSac?.value?.trim();

    // 1. SKU Match (highest confidence)
    if (itemSku) {
      const skuMatch = inventory.find((i) => i.sku.toLowerCase() === itemSku);
      if (skuMatch) {
        return {
          matchedItem: skuMatch,
          confidence: 0.98,
          isNewRecommended: false,
          reason: `Exact SKU match found: ${skuMatch.sku}`,
        };
      }
    }

    // 2. Name Match
    const nameMatch = inventory.find(
      (i) => i.name.toLowerCase() === desc || desc.includes(i.name.toLowerCase())
    );
    if (nameMatch) {
      return {
        matchedItem: nameMatch,
        confidence: 0.92,
        isNewRecommended: false,
        reason: `Matched existing inventory item "${nameMatch.name}"`,
      };
    }

    // If description looks like service or general expense, don't recommend inventory item
    if (
      /consult|advisory|legal|service|rent|lease|subscription|software|cloud|ad|marketing|travel/i.test(
        desc
      )
    ) {
      return {
        confidence: 0.95,
        isNewRecommended: false,
        reason: 'Identified as service line item, inventory tracking not applicable.',
      };
    }

    // Recommend new inventory item
    return {
      confidence: 0.82,
      isNewRecommended: true,
      reason: `No matching stock item found for "${item.description.value}". Suggest adding to Inventory Master.`,
      recommendedItem: {
        name: item.description.value,
        sku: item.sku?.value || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        hsn: itemHsn || '8471',
        unit: item.unit.value || 'NOS',
        stockGroup: 'General Components',
        gstRate: item.gstRate.value || 18,
        purchaseRate: item.rate.value || 0,
      },
    };
  }
}

export const inventoryMatchingService = new InventoryMatchingService();
