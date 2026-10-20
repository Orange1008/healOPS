package com.mediflow.inventory.controller;

import com.mediflow.inventory.model.InventoryItem;
import com.mediflow.inventory.repository.InventoryRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@CrossOrigin(origins = "*")
public class InventoryController {

    private final InventoryRepository inventoryRepo;

    public InventoryController(InventoryRepository inventoryRepo) {
        this.inventoryRepo = inventoryRepo;
    }

    @GetMapping
    public List<InventoryItem> getAllItems() {
        return inventoryRepo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<InventoryItem> getItemById(@PathVariable Long id) {
        return inventoryRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public InventoryItem createItem(@RequestBody InventoryItem item) {
        return inventoryRepo.save(item);
    }

    @PutMapping("/{id}/stock")
    public ResponseEntity<InventoryItem> updateStock(@PathVariable Long id, @RequestParam int quantity) {
        return inventoryRepo.findById(id).map(item -> {
            item.setQuantity(quantity);
            return ResponseEntity.ok(inventoryRepo.save(item));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable Long id) {
        inventoryRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
