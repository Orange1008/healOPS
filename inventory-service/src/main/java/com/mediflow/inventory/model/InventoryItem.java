package com.mediflow.inventory.model;

import jakarta.persistence.*;

@Entity
@Table(name = "inventory_items")
public class InventoryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String itemName;
    private String category; // PPE, PHARMACEUTICAL, SURGICAL, DIAGNOSTIC
    private int quantity;
    private int minimumThreshold;
    private String unit; // BOX, PACK, VIAL, UNIT
    private double unitPrice;

    public InventoryItem() {}

    public InventoryItem(String itemName, String category, int quantity, int minimumThreshold, String unit, double unitPrice) {
        this.itemName = itemName;
        this.category = category;
        this.quantity = quantity;
        this.minimumThreshold = minimumThreshold;
        this.unit = unit;
        this.unitPrice = unitPrice;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public int getMinimumThreshold() { return minimumThreshold; }
    public void setMinimumThreshold(int minimumThreshold) { this.minimumThreshold = minimumThreshold; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public double getUnitPrice() { return unitPrice; }
    public void setUnitPrice(double unitPrice) { this.unitPrice = unitPrice; }
}
