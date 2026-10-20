package com.mediflow.inventory.config;

import com.mediflow.inventory.model.InventoryItem;
import com.mediflow.inventory.repository.InventoryRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class InventoryDataInitializer {

    @Bean
    CommandLineRunner initInventory(InventoryRepository repo) {
        return args -> {
            if (repo.count() == 0) {
                repo.saveAll(List.of(
                        new InventoryItem("N95 Respirator Masks", "PPE", 1250, 200, "BOX", 45.00),
                        new InventoryItem("Sterile Surgical Gloves (Size 7.5)", "PPE", 800, 150, "BOX", 28.50),
                        new InventoryItem("IV Infusion Sets", "SURGICAL", 450, 100, "PACK", 18.00),
                        new InventoryItem("Digital Pulse Oximeters", "DIAGNOSTIC", 75, 15, "UNIT", 65.00)
                ));
            }
        };
    }
}
