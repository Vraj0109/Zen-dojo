import type { LldProject } from "./types";

// Batch F3 LLD projects (plan 0039). Java 17, standard library only, default package.
// Compiled with javac -Xlint:all and run (Main and Tests) with zero warnings.

export const LLD_PROJECTS_F3: Record<string, LldProject> = {
  "lldp-inventory": {
    files: [
      {
        name: "Clock.java",
        code: `public interface Clock {
    long currentTimeMillis();
}
`,
      },
      {
        name: "ManualClock.java",
        code: `import java.util.concurrent.atomic.AtomicLong;

public final class ManualClock implements Clock {
    private final AtomicLong millis;

    public ManualClock(long initialMillis) {
        this.millis = new AtomicLong(initialMillis);
    }

    public ManualClock() {
        this(1_000_000L);
    }

    @Override
    public long currentTimeMillis() {
        return millis.get();
    }

    public void set(long newMillis) {
        millis.set(newMillis);
    }

    public long advanceMillis(long delta) {
        if (delta < 0) throw new IllegalArgumentException("Cannot advance by negative delta");
        return millis.addAndGet(delta);
    }

    public long advanceSeconds(long seconds) {
        return advanceMillis(seconds * 1000L);
    }

    public long advanceMinutes(long minutes) {
        return advanceMillis(minutes * 60_000L);
    }
}
`,
      },
      {
        name: "Sku.java",
        code: `import java.util.Objects;

public final class Sku {
    private final String id;
    private final String name;
    private final String category;
    private final long priceCents;
    private final int weightGrams;

    public Sku(String id, String name, String category, long priceCents, int weightGrams) {
        if (id == null || id.isBlank()) throw new IllegalArgumentException("SKU id cannot be empty");
        if (name == null || name.isBlank()) throw new IllegalArgumentException("SKU name cannot be empty");
        this.id = id;
        this.name = name;
        this.category = category == null ? "GENERAL" : category;
        this.priceCents = Math.max(0, priceCents);
        this.weightGrams = Math.max(0, weightGrams);
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getCategory() { return category; }
    public long getPriceCents() { return priceCents; }
    public int getWeightGrams() { return weightGrams; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Sku sku = (Sku) o;
        return Objects.equals(id, sku.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Sku{" + id + ", name='" + name + "', price=" + priceCents + "c}";
    }
}
`,
      },
      {
        name: "Warehouse.java",
        code: `import java.util.Objects;

public final class Warehouse {
    private final String id;
    private final String name;
    private final String locationCode;
    private final int priority;
    private final boolean active;

    public Warehouse(String id, String name, String locationCode, int priority, boolean active) {
        if (id == null || id.isBlank()) throw new IllegalArgumentException("Warehouse id cannot be empty");
        if (name == null || name.isBlank()) throw new IllegalArgumentException("Warehouse name cannot be empty");
        this.id = id;
        this.name = name;
        this.locationCode = locationCode == null ? "DEFAULT" : locationCode;
        this.priority = priority;
        this.active = active;
    }

    public Warehouse(String id, String name, String locationCode, int priority) {
        this(id, name, locationCode, priority, true);
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getLocationCode() { return locationCode; }
    public int getPriority() { return priority; }
    public boolean isActive() { return active; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Warehouse warehouse = (Warehouse) o;
        return Objects.equals(id, warehouse.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Warehouse{" + id + ", name='" + name + "', priority=" + priority + "}";
    }
}
`,
      },
      {
        name: "StockLocationKey.java",
        code: `import java.util.Objects;

public final class StockLocationKey implements Comparable<StockLocationKey> {
    private final String warehouseId;
    private final String skuId;

    public StockLocationKey(String warehouseId, String skuId) {
        if (warehouseId == null || skuId == null) {
            throw new IllegalArgumentException("WarehouseId and SkuId cannot be null");
        }
        this.warehouseId = warehouseId;
        this.skuId = skuId;
    }

    public String getWarehouseId() { return warehouseId; }
    public String getSkuId() { return skuId; }

    @Override
    public int compareTo(StockLocationKey other) {
        int cmp = this.warehouseId.compareTo(other.warehouseId);
        if (cmp != 0) return cmp;
        return this.skuId.compareTo(other.skuId);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        StockLocationKey that = (StockLocationKey) o;
        return Objects.equals(warehouseId, that.warehouseId) && Objects.equals(skuId, that.skuId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(warehouseId, skuId);
    }

    @Override
    public String toString() {
        return warehouseId + ":" + skuId;
    }
}
`,
      },
      {
        name: "InventoryLevel.java",
        code: `public final class InventoryLevel {
    private int totalQuantity;
    private int reservedQuantity;
    private int reorderThreshold;
    private int reorderQuantity;

    public InventoryLevel(int initialTotal, int reorderThreshold, int reorderQuantity) {
        if (initialTotal < 0) throw new IllegalArgumentException("Total quantity cannot be negative");
        if (reorderThreshold < 0) throw new IllegalArgumentException("Reorder threshold cannot be negative");
        this.totalQuantity = initialTotal;
        this.reservedQuantity = 0;
        this.reorderThreshold = reorderThreshold;
        this.reorderQuantity = Math.max(1, reorderQuantity);
    }

    public synchronized int getTotalQuantity() {
        return totalQuantity;
    }

    public synchronized int getReservedQuantity() {
        return reservedQuantity;
    }

    public synchronized int getAvailableQuantity() {
        return totalQuantity - reservedQuantity;
    }

    public synchronized int getReorderThreshold() {
        return reorderThreshold;
    }

    public synchronized int getReorderQuantity() {
        return reorderQuantity;
    }

    public synchronized void setReorderThreshold(int threshold) {
        if (threshold < 0) throw new IllegalArgumentException("Threshold cannot be negative");
        this.reorderThreshold = threshold;
    }

    public synchronized void setReorderQuantity(int quantity) {
        if (quantity <= 0) throw new IllegalArgumentException("Quantity must be positive");
        this.reorderQuantity = quantity;
    }

    public synchronized void addStock(int amount) {
        if (amount <= 0) throw new IllegalArgumentException("Stock to add must be positive");
        this.totalQuantity += amount;
    }

    public synchronized boolean tryReserve(int amount) {
        if (amount <= 0) throw new IllegalArgumentException("Reserve amount must be positive");
        if (totalQuantity - reservedQuantity >= amount) {
            reservedQuantity += amount;
            return true;
        }
        return false;
    }

    public synchronized void confirm(int amount) {
        if (amount <= 0) throw new IllegalArgumentException("Confirm amount must be positive");
        if (reservedQuantity < amount) {
            throw new IllegalStateException("Cannot confirm more than currently reserved");
        }
        reservedQuantity -= amount;
        totalQuantity = Math.max(0, totalQuantity - amount);
    }

    public synchronized void release(int amount) {
        if (amount <= 0) throw new IllegalArgumentException("Release amount must be positive");
        reservedQuantity = Math.max(0, reservedQuantity - amount);
    }

    public synchronized boolean isBelowReorderThreshold() {
        return totalQuantity <= reorderThreshold;
    }

    @Override
    public synchronized String toString() {
        return "InventoryLevel{total=" + totalQuantity + ", reserved=" + reservedQuantity +
                ", available=" + (totalQuantity - reservedQuantity) + ", threshold=" + reorderThreshold + "}";
    }
}
`,
      },
      {
        name: "ReservationStatus.java",
        code: `public enum ReservationStatus {
    PENDING,
    CONFIRMED,
    RELEASED,
    EXPIRED
}
`,
      },
      {
        name: "ReservationItem.java",
        code: `import java.util.Objects;

public final class ReservationItem {
    private final String skuId;
    private final String warehouseId;
    private final int quantity;

    public ReservationItem(String skuId, String warehouseId, int quantity) {
        if (skuId == null || skuId.isBlank()) throw new IllegalArgumentException("SKU id cannot be empty");
        if (warehouseId == null || warehouseId.isBlank()) throw new IllegalArgumentException("Warehouse id cannot be empty");
        if (quantity <= 0) throw new IllegalArgumentException("Quantity must be positive");
        this.skuId = skuId;
        this.warehouseId = warehouseId;
        this.quantity = quantity;
    }

    public String getSkuId() { return skuId; }
    public String getWarehouseId() { return warehouseId; }
    public int getQuantity() { return quantity; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ReservationItem that = (ReservationItem) o;
        return quantity == that.quantity && Objects.equals(skuId, that.skuId) && Objects.equals(warehouseId, that.warehouseId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(skuId, warehouseId, quantity);
    }

    @Override
    public String toString() {
        return "ReservationItem{" + skuId + " x" + quantity + " from " + warehouseId + "}";
    }
}
`,
      },
      {
        name: "InventoryReservation.java",
        code: `import java.util.Collections;
import java.util.List;
import java.util.Objects;

public final class InventoryReservation {
    private final String id;
    private final String orderId;
    private final String customerId;
    private final List<ReservationItem> items;
    private final long createdAt;
    private final long expiresAt;
    private ReservationStatus status;

    public InventoryReservation(String id, String orderId, String customerId,
                                List<ReservationItem> items, long createdAt, long expiresAt) {
        if (id == null || id.isBlank()) throw new IllegalArgumentException("Reservation id cannot be empty");
        if (orderId == null || orderId.isBlank()) throw new IllegalArgumentException("Order id cannot be empty");
        if (customerId == null || customerId.isBlank()) throw new IllegalArgumentException("Customer id cannot be empty");
        if (items == null || items.isEmpty()) throw new IllegalArgumentException("Items cannot be empty");
        if (expiresAt <= createdAt) throw new IllegalArgumentException("Expiry must be strictly after creation time");

        this.id = id;
        this.orderId = orderId;
        this.customerId = customerId;
        this.items = List.copyOf(items);
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.status = ReservationStatus.PENDING;
    }

    public String getId() { return id; }
    public String getOrderId() { return orderId; }
    public String getCustomerId() { return customerId; }
    public List<ReservationItem> getItems() { return items; }
    public long getCreatedAt() { return createdAt; }
    public long getExpiresAt() { return expiresAt; }

    public synchronized ReservationStatus getStatus() { return status; }

    public synchronized boolean isPending() {
        return status == ReservationStatus.PENDING;
    }

    public synchronized boolean isExpired(long now) {
        return status == ReservationStatus.PENDING && now >= expiresAt;
    }

    public synchronized boolean transitionToConfirmed() {
        if (status == ReservationStatus.PENDING) {
            status = ReservationStatus.CONFIRMED;
            return true;
        }
        return false;
    }

    public synchronized boolean transitionToReleased() {
        if (status == ReservationStatus.PENDING) {
            status = ReservationStatus.RELEASED;
            return true;
        }
        return false;
    }

    public synchronized boolean transitionToExpired() {
        if (status == ReservationStatus.PENDING) {
            status = ReservationStatus.EXPIRED;
            return true;
        }
        return false;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        InventoryReservation that = (InventoryReservation) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public synchronized String toString() {
        return "InventoryReservation{" + id + ", order=" + orderId + ", status=" + status +
                ", items=" + items.size() + ", expiresAt=" + expiresAt + "}";
    }
}
`,
      },
      {
        name: "ReservationResult.java",
        code: `import java.util.Optional;

public final class ReservationResult {
    private final boolean success;
    private final InventoryReservation reservation;
    private final String errorMessage;

    private ReservationResult(boolean success, InventoryReservation reservation, String errorMessage) {
        this.success = success;
        this.reservation = reservation;
        this.errorMessage = errorMessage;
    }

    public static ReservationResult success(InventoryReservation reservation) {
        return new ReservationResult(true, reservation, null);
    }

    public static ReservationResult failure(String message) {
        return new ReservationResult(false, null, message);
    }

    public boolean isSuccess() { return success; }
    public Optional<InventoryReservation> getReservation() { return Optional.ofNullable(reservation); }
    public String getErrorMessage() { return errorMessage; }

    @Override
    public String toString() {
        return success ? "ReservationResult{SUCCESS: " + reservation.getId() + "}"
                       : "ReservationResult{FAILURE: " + errorMessage + "}";
    }
}
`,
      },
      {
        name: "FulfillmentLine.java",
        code: `import java.util.Objects;

public final class FulfillmentLine {
    private final String warehouseId;
    private final String skuId;
    private final int quantity;

    public FulfillmentLine(String warehouseId, String skuId, int quantity) {
        if (warehouseId == null || warehouseId.isBlank()) throw new IllegalArgumentException("WarehouseId cannot be empty");
        if (skuId == null || skuId.isBlank()) throw new IllegalArgumentException("SkuId cannot be empty");
        if (quantity <= 0) throw new IllegalArgumentException("Quantity must be positive");
        this.warehouseId = warehouseId;
        this.skuId = skuId;
        this.quantity = quantity;
    }

    public String getWarehouseId() { return warehouseId; }
    public String getSkuId() { return skuId; }
    public int getQuantity() { return quantity; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        FulfillmentLine that = (FulfillmentLine) o;
        return quantity == that.quantity && Objects.equals(warehouseId, that.warehouseId) && Objects.equals(skuId, that.skuId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(warehouseId, skuId, quantity);
    }

    @Override
    public String toString() {
        return "FulfillmentLine{" + skuId + " x" + quantity + " from " + warehouseId + "}";
    }
}
`,
      },
      {
        name: "FulfillmentPlan.java",
        code: `import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

public final class FulfillmentPlan {
    private final boolean feasible;
    private final List<FulfillmentLine> lines;
    private final String failureReason;

    private FulfillmentPlan(boolean feasible, List<FulfillmentLine> lines, String failureReason) {
        this.feasible = feasible;
        this.lines = lines == null ? Collections.emptyList() : List.copyOf(lines);
        this.failureReason = failureReason;
    }

    public static FulfillmentPlan success(List<FulfillmentLine> lines) {
        return new FulfillmentPlan(true, lines, null);
    }

    public static FulfillmentPlan failure(String reason) {
        return new FulfillmentPlan(false, Collections.emptyList(), reason);
    }

    public boolean isFeasible() { return feasible; }
    public List<FulfillmentLine> getLines() { return lines; }
    public String getFailureReason() { return failureReason; }

    public Set<String> getDistinctWarehouses() {
        return lines.stream().map(FulfillmentLine::getWarehouseId).collect(Collectors.toUnmodifiableSet());
    }

    public int totalItems() {
        return lines.stream().mapToInt(FulfillmentLine::getQuantity).sum();
    }

    @Override
    public String toString() {
        if (!feasible) return "FulfillmentPlan{FAILED: " + failureReason + "}";
        return "FulfillmentPlan{warehouses=" + getDistinctWarehouses().size() + ", lines=" + lines + "}";
    }
}
`,
      },
      {
        name: "AllocationStrategy.java",
        code: `import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;

public interface AllocationStrategy {
    FulfillmentPlan planFulfillment(
            Map<String, Integer> itemsNeeded,
            List<Warehouse> warehouses,
            BiFunction<String, String, Integer> stockLookup
    );
}
`,
      },
      {
        name: "SingleWarehouseAllocationStrategy.java",
        code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;

public final class SingleWarehouseAllocationStrategy implements AllocationStrategy {

    @Override
    public FulfillmentPlan planFulfillment(
            Map<String, Integer> itemsNeeded,
            List<Warehouse> warehouses,
            BiFunction<String, String, Integer> stockLookup) {

        if (itemsNeeded == null || itemsNeeded.isEmpty()) {
            return FulfillmentPlan.failure("No items requested");
        }

        List<Warehouse> activeWarehouses = warehouses.stream()
                .filter(Warehouse::isActive)
                .sorted(Comparator.comparingInt(Warehouse::getPriority).reversed().thenComparing(Warehouse::getId))
                .toList();

        if (activeWarehouses.isEmpty()) {
            return FulfillmentPlan.failure("No active warehouses available");
        }

        // Phase 1: Try to find a single warehouse that can fulfill 100% of the request
        for (Warehouse wh : activeWarehouses) {
            boolean canFulfillAll = true;
            for (Map.Entry<String, Integer> entry : itemsNeeded.entrySet()) {
                int avail = stockLookup.apply(wh.getId(), entry.getKey());
                if (avail < entry.getValue()) {
                    canFulfillAll = false;
                    break;
                }
            }
            if (canFulfillAll) {
                List<FulfillmentLine> lines = new ArrayList<>();
                for (Map.Entry<String, Integer> entry : itemsNeeded.entrySet()) {
                    lines.add(new FulfillmentLine(wh.getId(), entry.getKey(), entry.getValue()));
                }
                return FulfillmentPlan.success(lines);
            }
        }

        // Phase 2: Multi-warehouse fallback allocation
        Map<String, Integer> remaining = new HashMap<>(itemsNeeded);
        List<FulfillmentLine> lines = new ArrayList<>();

        for (Warehouse wh : activeWarehouses) {
            for (Map.Entry<String, Integer> entry : new ArrayList<>(remaining.entrySet())) {
                String skuId = entry.getKey();
                int needed = entry.getValue();
                if (needed <= 0) continue;

                int avail = stockLookup.apply(wh.getId(), skuId);
                if (avail > 0) {
                    int take = Math.min(avail, needed);
                    lines.add(new FulfillmentLine(wh.getId(), skuId, take));
                    int rem = needed - take;
                    if (rem == 0) {
                        remaining.remove(skuId);
                    } else {
                        remaining.put(skuId, rem);
                    }
                }
            }
            if (remaining.isEmpty()) {
                break;
            }
        }

        if (!remaining.isEmpty()) {
            return FulfillmentPlan.failure("Insufficient stock across all warehouses for items: " + remaining);
        }

        return FulfillmentPlan.success(lines);
    }
}
`,
      },
      {
        name: "PriorityWarehouseAllocationStrategy.java",
        code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;

public final class PriorityWarehouseAllocationStrategy implements AllocationStrategy {

    @Override
    public FulfillmentPlan planFulfillment(
            Map<String, Integer> itemsNeeded,
            List<Warehouse> warehouses,
            BiFunction<String, String, Integer> stockLookup) {

        if (itemsNeeded == null || itemsNeeded.isEmpty()) {
            return FulfillmentPlan.failure("No items requested");
        }

        List<Warehouse> activeWarehouses = warehouses.stream()
                .filter(Warehouse::isActive)
                .sorted(Comparator.comparingInt(Warehouse::getPriority).reversed().thenComparing(Warehouse::getId))
                .toList();

        Map<String, Integer> remaining = new HashMap<>(itemsNeeded);
        List<FulfillmentLine> lines = new ArrayList<>();

        for (Warehouse wh : activeWarehouses) {
            for (Map.Entry<String, Integer> entry : new ArrayList<>(remaining.entrySet())) {
                String skuId = entry.getKey();
                int needed = entry.getValue();
                if (needed <= 0) continue;

                int avail = stockLookup.apply(wh.getId(), skuId);
                if (avail > 0) {
                    int take = Math.min(avail, needed);
                    lines.add(new FulfillmentLine(wh.getId(), skuId, take));
                    int rem = needed - take;
                    if (rem == 0) {
                        remaining.remove(skuId);
                    } else {
                        remaining.put(skuId, rem);
                    }
                }
            }
            if (remaining.isEmpty()) break;
        }

        if (!remaining.isEmpty()) {
            return FulfillmentPlan.failure("Insufficient inventory across priority warehouses: " + remaining);
        }

        return FulfillmentPlan.success(lines);
    }
}
`,
      },
      {
        name: "RestockAlert.java",
        code: `import java.util.Objects;

public final class RestockAlert {
    private final String alertId;
    private final String warehouseId;
    private final String skuId;
    private final int currentTotal;
    private final int threshold;
    private final int suggestedReorderQuantity;
    private final long timestamp;

    public RestockAlert(String alertId, String warehouseId, String skuId,
                        int currentTotal, int threshold, int suggestedReorderQuantity, long timestamp) {
        this.alertId = alertId;
        this.warehouseId = warehouseId;
        this.skuId = skuId;
        this.currentTotal = currentTotal;
        this.threshold = threshold;
        this.suggestedReorderQuantity = suggestedReorderQuantity;
        this.timestamp = timestamp;
    }

    public String getAlertId() { return alertId; }
    public String getWarehouseId() { return warehouseId; }
    public String getSkuId() { return skuId; }
    public int getCurrentTotal() { return currentTotal; }
    public int getThreshold() { return threshold; }
    public int getSuggestedReorderQuantity() { return suggestedReorderQuantity; }
    public long getTimestamp() { return timestamp; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RestockAlert that = (RestockAlert) o;
        return Objects.equals(alertId, that.alertId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(alertId);
    }

    @Override
    public String toString() {
        return "RestockAlert{" + skuId + " at " + warehouseId + ": current=" + currentTotal +
                " <= threshold=" + threshold + ", reorder=" + suggestedReorderQuantity + "}";
    }
}
`,
      },
      {
        name: "RestockAlertListener.java",
        code: `@FunctionalInterface
public interface RestockAlertListener {
    void onAlert(RestockAlert alert);
}
`,
      },
      {
        name: "InventoryService.java",
        code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

public final class InventoryService {
    private final Clock clock;
    private final Map<String, Sku> skuCatalog = new ConcurrentHashMap<>();
    private final Map<String, Warehouse> warehouseCatalog = new ConcurrentHashMap<>();
    private final Map<StockLocationKey, InventoryLevel> stockMatrix = new ConcurrentHashMap<>();
    private final Map<String, InventoryReservation> reservations = new ConcurrentHashMap<>();
    private final List<RestockAlertListener> alertListeners = new CopyOnWriteArrayList<>();
    private final List<RestockAlert> alertHistory = new CopyOnWriteArrayList<>();
    private final AtomicLong reservationSeq = new AtomicLong(1000);
    private final AtomicLong alertSeq = new AtomicLong(5000);
    private volatile AllocationStrategy allocationStrategy;

    public InventoryService(Clock clock, AllocationStrategy allocationStrategy) {
        this.clock = Objects.requireNonNull(clock, "clock cannot be null");
        this.allocationStrategy = Objects.requireNonNull(allocationStrategy, "allocationStrategy cannot be null");
    }

    public InventoryService(Clock clock) {
        this(clock, new SingleWarehouseAllocationStrategy());
    }

    public void setAllocationStrategy(AllocationStrategy allocationStrategy) {
        this.allocationStrategy = Objects.requireNonNull(allocationStrategy, "strategy cannot be null");
    }

    public AllocationStrategy getAllocationStrategy() {
        return allocationStrategy;
    }

    public Clock getClock() {
        return clock;
    }

    // --- Catalog Management ---

    public void registerSku(Sku sku) {
        Objects.requireNonNull(sku, "SKU cannot be null");
        skuCatalog.put(sku.getId(), sku);
    }

    public Optional<Sku> getSku(String skuId) {
        return Optional.ofNullable(skuCatalog.get(skuId));
    }

    public List<Sku> getAllSkus() {
        return List.copyOf(skuCatalog.values());
    }

    public void registerWarehouse(Warehouse warehouse) {
        Objects.requireNonNull(warehouse, "Warehouse cannot be null");
        warehouseCatalog.put(warehouse.getId(), warehouse);
    }

    public Optional<Warehouse> getWarehouse(String warehouseId) {
        return Optional.ofNullable(warehouseCatalog.get(warehouseId));
    }

    public List<Warehouse> getAllWarehouses() {
        return List.copyOf(warehouseCatalog.values());
    }

    // --- Stock Management ---

    public void addStock(String warehouseId, String skuId, int quantity, int threshold, int reorderQuantity) {
        if (!warehouseCatalog.containsKey(warehouseId)) {
            throw new IllegalArgumentException("Unknown warehouse: " + warehouseId);
        }
        if (!skuCatalog.containsKey(skuId)) {
            throw new IllegalArgumentException("Unknown SKU: " + skuId);
        }
        StockLocationKey key = new StockLocationKey(warehouseId, skuId);
        stockMatrix.compute(key, (k, existing) -> {
            if (existing == null) {
                return new InventoryLevel(quantity, threshold, reorderQuantity);
            }
            existing.addStock(quantity);
            if (threshold >= 0) existing.setReorderThreshold(threshold);
            if (reorderQuantity > 0) existing.setReorderQuantity(reorderQuantity);
            return existing;
        });
    }

    public void addStock(String warehouseId, String skuId, int quantity) {
        addStock(warehouseId, skuId, quantity, 10, 50);
    }

    public Optional<InventoryLevel> getStockLevel(String warehouseId, String skuId) {
        return Optional.ofNullable(stockMatrix.get(new StockLocationKey(warehouseId, skuId)));
    }

    public int getAvailableStock(String warehouseId, String skuId) {
        InventoryLevel level = stockMatrix.get(new StockLocationKey(warehouseId, skuId));
        return level != null ? level.getAvailableQuantity() : 0;
    }

    public int getTotalStock(String warehouseId, String skuId) {
        InventoryLevel level = stockMatrix.get(new StockLocationKey(warehouseId, skuId));
        return level != null ? level.getTotalQuantity() : 0;
    }

    public int getReservedStock(String warehouseId, String skuId) {
        InventoryLevel level = stockMatrix.get(new StockLocationKey(warehouseId, skuId));
        return level != null ? level.getReservedQuantity() : 0;
    }

    public int getTotalAvailableAcrossWarehouses(String skuId) {
        int total = 0;
        for (Map.Entry<StockLocationKey, InventoryLevel> entry : stockMatrix.entrySet()) {
            if (entry.getKey().getSkuId().equals(skuId)) {
                total += entry.getValue().getAvailableQuantity();
            }
        }
        return total;
    }

    // --- Reservation Lifecycle ---

    public ReservationResult holdInventory(String orderId, String customerId,
                                          Map<String, Integer> itemsNeeded, long ttlMillis) {
        if (orderId == null || orderId.isBlank()) return ReservationResult.failure("Invalid orderId");
        if (customerId == null || customerId.isBlank()) return ReservationResult.failure("Invalid customerId");
        if (itemsNeeded == null || itemsNeeded.isEmpty()) return ReservationResult.failure("Items map cannot be empty");
        if (ttlMillis <= 0) return ReservationResult.failure("TTL must be positive");

        for (Map.Entry<String, Integer> entry : itemsNeeded.entrySet()) {
            if (!skuCatalog.containsKey(entry.getKey())) {
                return ReservationResult.failure("Unknown SKU: " + entry.getKey());
            }
            if (entry.getValue() <= 0) {
                return ReservationResult.failure("Quantity must be positive for SKU: " + entry.getKey());
            }
        }

        // Run allocation strategy to find optimal fulfillment plan
        List<Warehouse> warehouses = new ArrayList<>(warehouseCatalog.values());
        FulfillmentPlan plan = allocationStrategy.planFulfillment(
                itemsNeeded,
                warehouses,
                this::getAvailableStock
        );

        if (!plan.isFeasible()) {
            return ReservationResult.failure(plan.getFailureReason());
        }

        // To guarantee deadlock freedom with concurrent reservations,
        // we sort all required stock locations in canonical order before locking.
        List<FulfillmentLine> lines = plan.getLines();
        List<StockLocationKey> sortedKeys = lines.stream()
                .map(l -> new StockLocationKey(l.getWarehouseId(), l.getSkuId()))
                .distinct()
                .sorted()
                .toList();

        // Map quantity needed per sorted key
        Map<StockLocationKey, Integer> qtyPerLocation = new HashMap<>();
        for (FulfillmentLine line : lines) {
            StockLocationKey key = new StockLocationKey(line.getWarehouseId(), line.getSkuId());
            qtyPerLocation.merge(key, line.getQuantity(), Integer::sum);
        }

        // Acquire reservations under ordered synchronization
        boolean reservedAll = true;
        List<StockLocationKey> lockedAndReserved = new ArrayList<>();

        for (StockLocationKey key : sortedKeys) {
            InventoryLevel level = stockMatrix.get(key);
            if (level == null) {
                reservedAll = false;
                break;
            }
            int needed = qtyPerLocation.get(key);
            if (level.tryReserve(needed)) {
                lockedAndReserved.add(key);
            } else {
                reservedAll = false;
                break;
            }
        }

        if (!reservedAll) {
            // Roll back any partially acquired reservations
            for (StockLocationKey key : lockedAndReserved) {
                InventoryLevel level = stockMatrix.get(key);
                if (level != null) {
                    level.release(qtyPerLocation.get(key));
                }
            }
            return ReservationResult.failure("Concurrent stock change: insufficient available inventory");
        }

        long now = clock.currentTimeMillis();
        long expiresAt = now + ttlMillis;
        String resId = "res-" + reservationSeq.incrementAndGet();

        List<ReservationItem> reservationItems = new ArrayList<>();
        for (FulfillmentLine line : lines) {
            reservationItems.add(new ReservationItem(line.getSkuId(), line.getWarehouseId(), line.getQuantity()));
        }

        InventoryReservation reservation = new InventoryReservation(
                resId, orderId, customerId, reservationItems, now, expiresAt
        );
        reservations.put(resId, reservation);
        return ReservationResult.success(reservation);
    }

    public boolean confirmReservation(String reservationId) {
        InventoryReservation reservation = reservations.get(reservationId);
        if (reservation == null) return false;

        synchronized (reservation) {
            if (!reservation.transitionToConfirmed()) {
                return false;
            }
            // Apply deductions to physical stock
            for (ReservationItem item : reservation.getItems()) {
                StockLocationKey key = new StockLocationKey(item.getWarehouseId(), item.getSkuId());
                InventoryLevel level = stockMatrix.get(key);
                if (level != null) {
                    level.confirm(item.getQuantity());
                    checkAndNotifyRestock(item.getWarehouseId(), item.getSkuId(), level);
                }
            }
            return true;
        }
    }

    public boolean releaseReservation(String reservationId) {
        InventoryReservation reservation = reservations.get(reservationId);
        if (reservation == null) return false;

        synchronized (reservation) {
            if (!reservation.transitionToReleased()) {
                return false;
            }
            for (ReservationItem item : reservation.getItems()) {
                StockLocationKey key = new StockLocationKey(item.getWarehouseId(), item.getSkuId());
                InventoryLevel level = stockMatrix.get(key);
                if (level != null) {
                    level.release(item.getQuantity());
                }
            }
            return true;
        }
    }

    public List<String> cleanupExpiredHolds() {
        long now = clock.currentTimeMillis();
        List<String> expiredIds = new ArrayList<>();

        for (InventoryReservation reservation : reservations.values()) {
            if (reservation.isExpired(now)) {
                synchronized (reservation) {
                    if (reservation.transitionToExpired()) {
                        for (ReservationItem item : reservation.getItems()) {
                            StockLocationKey key = new StockLocationKey(item.getWarehouseId(), item.getSkuId());
                            InventoryLevel level = stockMatrix.get(key);
                            if (level != null) {
                                level.release(item.getQuantity());
                            }
                        }
                        expiredIds.add(reservation.getId());
                    }
                }
            }
        }
        return Collections.unmodifiableList(expiredIds);
    }

    public Optional<InventoryReservation> getReservation(String reservationId) {
        return Optional.ofNullable(reservations.get(reservationId));
    }

    // --- Restock Monitoring ---

    public void addAlertListener(RestockAlertListener listener) {
        if (listener != null) alertListeners.add(listener);
    }

    public void removeAlertListener(RestockAlertListener listener) {
        alertListeners.remove(listener);
    }

    public List<RestockAlert> getAlertHistory() {
        return Collections.unmodifiableList(alertHistory);
    }

    private void checkAndNotifyRestock(String warehouseId, String skuId, InventoryLevel level) {
        if (level.isBelowReorderThreshold()) {
            String alertId = "alt-" + alertSeq.incrementAndGet();
            RestockAlert alert = new RestockAlert(
                    alertId,
                    warehouseId,
                    skuId,
                    level.getTotalQuantity(),
                    level.getReorderThreshold(),
                    level.getReorderQuantity(),
                    clock.currentTimeMillis()
            );
            alertHistory.add(alert);
            for (RestockAlertListener listener : alertListeners) {
                try {
                    listener.onAlert(alert);
                } catch (Exception ignored) {
                }
            }
        }
    }
}
`,
      },
      {
        name: "Main.java",
        code: `import java.util.Map;

public class Main {
    public static void main(String[] args) {
        ManualClock clock = new ManualClock(1_700_000_000_000L);
        InventoryService service = new InventoryService(clock);

        // 1. Catalogs
        Sku laptop = new Sku("SKU-LAPTOP", "Pro Laptop 15", "ELECTRONICS", 129900, 1800);
        Sku mouse = new Sku("SKU-MOUSE", "Wireless Ergonomic Mouse", "ACCESSORIES", 4900, 120);
        Sku keyboard = new Sku("SKU-KEYBOARD", "Mechanical Keyboard", "ACCESSORIES", 8900, 850);
        service.registerSku(laptop);
        service.registerSku(mouse);
        service.registerSku(keyboard);

        Warehouse east = new Warehouse("WH-EAST", "East Coast Fulfillment", "US-NY", 100);
        Warehouse west = new Warehouse("WH-WEST", "West Coast Fulfillment", "US-CA", 80);
        service.registerWarehouse(east);
        service.registerWarehouse(west);

        System.out.println("Initialized catalogs: 3 SKUs, 2 Warehouses");

        // 2. Add initial inventory (total, threshold, reorderQty)
        service.addStock("WH-EAST", "SKU-LAPTOP", 20, 5, 25);
        service.addStock("WH-EAST", "SKU-MOUSE", 50, 15, 50);
        service.addStock("WH-WEST", "SKU-LAPTOP", 15, 5, 25);
        service.addStock("WH-WEST", "SKU-KEYBOARD", 40, 10, 30);

        System.out.println("WH-EAST LAPTOP available: " + service.getAvailableStock("WH-EAST", "SKU-LAPTOP"));

        // 3. Listener for restock alerts
        service.addAlertListener(alert ->
            System.out.println("RESTOCK ALERT: " + alert.getSkuId() + " at " + alert.getWarehouseId() +
                    " current=" + alert.getCurrentTotal() + " <= threshold=" + alert.getThreshold())
        );

        // 4. Reserve single-warehouse order (held for 10 minutes)
        long tenMins = 10 * 60 * 1000L;
        ReservationResult r1 = service.holdInventory(
                "ORD-5001", "CUST-99",
                Map.of("SKU-LAPTOP", 2, "SKU-MOUSE", 3),
                tenMins
        );
        System.out.println("Reservation 1 created: " + r1.isSuccess() + ", id: " + r1.getReservation().get().getId());
        System.out.println("WH-EAST LAPTOP available after hold: " + service.getAvailableStock("WH-EAST", "SKU-LAPTOP"));
        System.out.println("WH-EAST LAPTOP reserved after hold: " + service.getReservedStock("WH-EAST", "SKU-LAPTOP"));

        // 5. Confirm reservation (customer completes payment)
        boolean confirmed = service.confirmReservation(r1.getReservation().get().getId());
        System.out.println("Reservation 1 confirmed: " + confirmed);
        System.out.println("WH-EAST LAPTOP total after confirm: " + service.getTotalStock("WH-EAST", "SKU-LAPTOP"));

        // 6. Reservation that expires: customer abandons cart
        ReservationResult r2 = service.holdInventory(
                "ORD-5002", "CUST-101",
                Map.of("SKU-LAPTOP", 5),
                tenMins
        );
        System.out.println("Reservation 2 created: " + r2.isSuccess() + ", held 5 laptops");
        System.out.println("Available before TTL expiry: " + service.getAvailableStock("WH-EAST", "SKU-LAPTOP"));

        // Fast forward 11 minutes
        clock.advanceMinutes(11);
        var expired = service.cleanupExpiredHolds();
        System.out.println("Expired reservations cleaned: " + expired.size());
        System.out.println("Available after TTL expiry cleanup: " + service.getAvailableStock("WH-EAST", "SKU-LAPTOP"));

        // 7. Multi-warehouse allocation (requires items only available in different warehouses)
        ReservationResult r3 = service.holdInventory(
                "ORD-5003", "CUST-202",
                Map.of("SKU-MOUSE", 2, "SKU-KEYBOARD", 3),
                tenMins
        );
        System.out.println("Multi-warehouse reservation 3 created: " + r3.isSuccess());
        var res3 = r3.getReservation().get();
        System.out.println("Allocation items: " + res3.getItems());
        service.confirmReservation(res3.getId());
        System.out.println("Reservation 3 confirmed across multi-warehouse fulfillment");
    }
}
`,
      },
    ],
    tests: [
      {
        name: "Tests.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

public class Tests {
    private static int checks = 0;

    private static void check(boolean condition, String message) {
        checks++;
        if (!condition) {
            throw new AssertionError("FAIL: " + message);
        }
    }

    public static void main(String[] args) throws Exception {
        testBasicCatalogAndStock();
        testHoldReservationDeductsAvailableNotTotal();
        testConfirmReservationDeductsBothTotalAndReserved();
        testManualReleaseReservation();
        testTtlHoldExpiryAutoRelease();
        testSingleWarehousePreference();
        testMultiWarehouseSplitAllocation();
        testRestockThresholdAlerts();
        testInsufficientStockFailsGracefully();
        testConcurrentReservationsPreventOversell();

        System.out.println("PASS: all " + checks + " checks passed");
    }

    private static void testBasicCatalogAndStock() {
        ManualClock clock = new ManualClock(1000L);
        InventoryService service = new InventoryService(clock);

        Sku sku = new Sku("SKU-1", "Widget", "HARDWARE", 1000, 200);
        Warehouse wh = new Warehouse("WH-1", "Central", "US-IL", 10);
        service.registerSku(sku);
        service.registerWarehouse(wh);

        check(service.getSku("SKU-1").isPresent(), "SKU registered");
        check(service.getWarehouse("WH-1").isPresent(), "Warehouse registered");

        service.addStock("WH-1", "SKU-1", 50, 10, 100);
        check(service.getTotalStock("WH-1", "SKU-1") == 50, "total stock is 50");
        check(service.getAvailableStock("WH-1", "SKU-1") == 50, "available stock is 50");
        check(service.getReservedStock("WH-1", "SKU-1") == 0, "reserved stock is 0");
    }

    private static void testHoldReservationDeductsAvailableNotTotal() {
        ManualClock clock = new ManualClock(1000L);
        InventoryService service = new InventoryService(clock);
        service.registerSku(new Sku("SKU-1", "Widget", "HARDWARE", 1000, 200));
        service.registerWarehouse(new Warehouse("WH-1", "Central", "US-IL", 10));
        service.addStock("WH-1", "SKU-1", 20, 5, 20);

        ReservationResult res = service.holdInventory("ORD-1", "CUST-1", Map.of("SKU-1", 7), 600_000L);
        check(res.isSuccess(), "hold reservation succeeded");
        check(service.getTotalStock("WH-1", "SKU-1") == 20, "total stock still 20");
        check(service.getReservedStock("WH-1", "SKU-1") == 7, "reserved stock is 7");
        check(service.getAvailableStock("WH-1", "SKU-1") == 13, "available stock is 13");
    }

    private static void testConfirmReservationDeductsBothTotalAndReserved() {
        ManualClock clock = new ManualClock(1000L);
        InventoryService service = new InventoryService(clock);
        service.registerSku(new Sku("SKU-1", "Widget", "HARDWARE", 1000, 200));
        service.registerWarehouse(new Warehouse("WH-1", "Central", "US-IL", 10));
        service.addStock("WH-1", "SKU-1", 30, 5, 20);

        ReservationResult res = service.holdInventory("ORD-1", "CUST-1", Map.of("SKU-1", 10), 600_000L);
        String id = res.getReservation().get().getId();

        boolean ok = service.confirmReservation(id);
        check(ok, "confirmReservation succeeded");
        check(service.getTotalStock("WH-1", "SKU-1") == 20, "total stock reduced to 20");
        check(service.getReservedStock("WH-1", "SKU-1") == 0, "reserved stock back to 0");
        check(service.getAvailableStock("WH-1", "SKU-1") == 20, "available stock is 20");

        // Confirming twice should be safely ignored
        boolean ok2 = service.confirmReservation(id);
        check(!ok2, "cannot confirm already confirmed reservation");
    }

    private static void testManualReleaseReservation() {
        ManualClock clock = new ManualClock(1000L);
        InventoryService service = new InventoryService(clock);
        service.registerSku(new Sku("SKU-1", "Widget", "HARDWARE", 1000, 200));
        service.registerWarehouse(new Warehouse("WH-1", "Central", "US-IL", 10));
        service.addStock("WH-1", "SKU-1", 20, 5, 20);

        ReservationResult res = service.holdInventory("ORD-1", "CUST-1", Map.of("SKU-1", 8), 600_000L);
        String id = res.getReservation().get().getId();
        check(service.getAvailableStock("WH-1", "SKU-1") == 12, "available is 12");

        boolean ok = service.releaseReservation(id);
        check(ok, "releaseReservation succeeded");
        check(service.getAvailableStock("WH-1", "SKU-1") == 20, "available restored to 20");
        check(service.getReservedStock("WH-1", "SKU-1") == 0, "reserved is 0");
    }

    private static void testTtlHoldExpiryAutoRelease() {
        ManualClock clock = new ManualClock(1_000_000L);
        InventoryService service = new InventoryService(clock);
        service.registerSku(new Sku("SKU-1", "Widget", "HARDWARE", 1000, 200));
        service.registerWarehouse(new Warehouse("WH-1", "Central", "US-IL", 10));
        service.addStock("WH-1", "SKU-1", 15, 5, 20);

        // 10 minutes TTL = 600,000 ms
        ReservationResult res = service.holdInventory("ORD-1", "CUST-1", Map.of("SKU-1", 10), 600_000L);
        String id = res.getReservation().get().getId();
        check(service.getAvailableStock("WH-1", "SKU-1") == 5, "available is 5 during hold");

        // Advance 5 minutes - not expired yet
        clock.advanceMinutes(5);
        List<String> expiredBefore = service.cleanupExpiredHolds();
        check(expiredBefore.isEmpty(), "not expired at 5 mins");
        check(service.getAvailableStock("WH-1", "SKU-1") == 5, "still held at 5 mins");

        // Advance another 6 minutes (total 11 mins elapsed)
        clock.advanceMinutes(6);
        List<String> expiredAfter = service.cleanupExpiredHolds();
        check(expiredAfter.size() == 1, "1 hold expired");
        check(expiredAfter.contains(id), "contains target reservation id");
        check(service.getAvailableStock("WH-1", "SKU-1") == 15, "available fully restored after expiry");
        check(service.getReservedStock("WH-1", "SKU-1") == 0, "reserved is 0 after expiry");

        // Confirming an expired reservation must fail
        check(!service.confirmReservation(id), "cannot confirm expired reservation");
    }

    private static void testSingleWarehousePreference() {
        ManualClock clock = new ManualClock(1000L);
        InventoryService service = new InventoryService(clock);
        service.registerSku(new Sku("SKU-A", "Item A", "CAT", 100, 10));
        service.registerSku(new Sku("SKU-B", "Item B", "CAT", 200, 20));

        // WH-1 has priority 100, WH-2 has priority 50
        service.registerWarehouse(new Warehouse("WH-1", "High Priority", "US-NY", 100));
        service.registerWarehouse(new Warehouse("WH-2", "Low Priority", "US-CA", 50));

        // WH-1 has only SKU-A; WH-2 has both SKU-A and SKU-B
        service.addStock("WH-1", "SKU-A", 10);
        service.addStock("WH-2", "SKU-A", 10);
        service.addStock("WH-2", "SKU-B", 10);

        // Order needs SKU-A and SKU-B. Even though WH-1 has higher priority, only WH-2 can fulfill both in a single shipment!
        ReservationResult res = service.holdInventory("ORD-1", "CUST-1", Map.of("SKU-A", 5, "SKU-B", 5), 600_000L);
        check(res.isSuccess(), "single warehouse fulfillment planned");
        InventoryReservation r = res.getReservation().get();
        for (ReservationItem item : r.getItems()) {
            check("WH-2".equals(item.getWarehouseId()), "allocated to single warehouse WH-2: " + item.getWarehouseId());
        }
    }

    private static void testMultiWarehouseSplitAllocation() {
        ManualClock clock = new ManualClock(1000L);
        InventoryService service = new InventoryService(clock);
        service.registerSku(new Sku("SKU-A", "Item A", "CAT", 100, 10));
        service.registerWarehouse(new Warehouse("WH-1", "Wh 1", "US-NY", 100));
        service.registerWarehouse(new Warehouse("WH-2", "Wh 2", "US-CA", 50));

        // Total 15 units needed; WH-1 has 10, WH-2 has 10
        service.addStock("WH-1", "SKU-A", 10);
        service.addStock("WH-2", "SKU-A", 10);

        ReservationResult res = service.holdInventory("ORD-SPLIT", "CUST-1", Map.of("SKU-A", 15), 600_000L);
        check(res.isSuccess(), "split fulfillment succeeded");
        InventoryReservation r = res.getReservation().get();
        check(r.getItems().size() == 2, "split across 2 warehouses");
        int totalQty = r.getItems().stream().mapToInt(ReservationItem::getQuantity).sum();
        check(totalQty == 15, "total reserved quantity is 15");
    }

    private static void testRestockThresholdAlerts() {
        ManualClock clock = new ManualClock(1000L);
        InventoryService service = new InventoryService(clock);
        service.registerSku(new Sku("SKU-X", "Phone", "ELECTRONICS", 80000, 300));
        service.registerWarehouse(new Warehouse("WH-1", "East", "US-NY", 100));

        // Initial total 15, threshold 5
        service.addStock("WH-1", "SKU-X", 15, 5, 50);

        List<RestockAlert> received = new ArrayList<>();
        service.addAlertListener(received::add);

        // Buy 8 -> leaves 7 total. 7 > 5, no alert
        ReservationResult r1 = service.holdInventory("ORD-1", "CUST-1", Map.of("SKU-X", 8), 600_000L);
        service.confirmReservation(r1.getReservation().get().getId());
        check(received.isEmpty(), "no alert when total 7 > threshold 5");

        // Buy 3 -> leaves 4 total. 4 <= 5, restock alert must fire!
        ReservationResult r2 = service.holdInventory("ORD-2", "CUST-2", Map.of("SKU-X", 3), 600_000L);
        service.confirmReservation(r2.getReservation().get().getId());

        check(received.size() == 1, "exactly 1 restock alert fired");
        RestockAlert alert = received.get(0);
        check("SKU-X".equals(alert.getSkuId()), "alert for SKU-X");
        check("WH-1".equals(alert.getWarehouseId()), "alert for WH-1");
        check(alert.getCurrentTotal() == 4, "current total is 4");
        check(alert.getThreshold() == 5, "threshold is 5");
        check(alert.getSuggestedReorderQuantity() == 50, "suggested reorder is 50");
    }

    private static void testInsufficientStockFailsGracefully() {
        ManualClock clock = new ManualClock(1000L);
        InventoryService service = new InventoryService(clock);
        service.registerSku(new Sku("SKU-A", "Item A", "CAT", 100, 10));
        service.registerWarehouse(new Warehouse("WH-1", "Wh 1", "US-NY", 100));
        service.addStock("WH-1", "SKU-A", 5);

        ReservationResult res = service.holdInventory("ORD-FAIL", "CUST-1", Map.of("SKU-A", 10), 600_000L);
        check(!res.isSuccess(), "cannot hold more than available stock");
        check(service.getAvailableStock("WH-1", "SKU-A") == 5, "available stock unchanged");
        check(service.getReservedStock("WH-1", "SKU-A") == 0, "reserved stock unchanged");
    }

    private static void testConcurrentReservationsPreventOversell() throws Exception {
        ManualClock clock = new ManualClock(1000L);
        InventoryService service = new InventoryService(clock);
        service.registerSku(new Sku("HOT-ITEM", "Hot Console", "GAMING", 50000, 1500));
        service.registerWarehouse(new Warehouse("WH-CENTRAL", "Central", "US-IL", 100));

        // Total available = 20 units
        service.addStock("WH-CENTRAL", "HOT-ITEM", 20, 5, 50);

        int threadCount = 20;
        int requestedPerThread = 5; // Each thread wants 5 units. At most 4 threads can succeed!
        ExecutorService exec = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            final int idx = i;
            exec.submit(() -> {
                try {
                    startLatch.await();
                    ReservationResult res = service.holdInventory(
                            "ORD-CONCUR-" + idx, "CUST-" + idx,
                            Map.of("HOT-ITEM", requestedPerThread),
                            600_000L
                    );
                    if (res.isSuccess()) {
                        successCount.incrementAndGet();
                    } else {
                        failureCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        doneLatch.await();
        exec.shutdown();

        check(successCount.get() == 4, "exactly 4 threads acquired reservation (4 x 5 = 20 items), got " + successCount.get());
        check(failureCount.get() == 16, "exactly 16 threads rejected, got " + failureCount.get());
        check(service.getAvailableStock("WH-CENTRAL", "HOT-ITEM") == 0, "available stock is exactly 0");
        check(service.getReservedStock("WH-CENTRAL", "HOT-ITEM") == 20, "reserved stock is exactly 20");
    }
}
`,
      },
    ],
    expectedOutput: [
      "Initialized catalogs: 3 SKUs, 2 Warehouses",
      "WH-EAST LAPTOP available: 20",
      "Reservation 1 created: true, id: res-1001",
      "WH-EAST LAPTOP available after hold: 18",
      "WH-EAST LAPTOP reserved after hold: 2",
      "Reservation 1 confirmed: true",
      "WH-EAST LAPTOP total after confirm: 18",
      "Reservation 2 created: true, held 5 laptops",
      "Available before TTL expiry: 13",
      "Expired reservations cleaned: 1",
      "Available after TTL expiry cleanup: 18",
      "Multi-warehouse reservation 3 created: true",
      "Allocation items: [ReservationItem{SKU-MOUSE x2 from WH-EAST}, ReservationItem{SKU-KEYBOARD x3 from WH-WEST}]",
      "Reservation 3 confirmed across multi-warehouse fulfillment",
    ],
  },
  "lldp-social-feed": {
    files: [
      {
        name: "Clock.java",
        code: `public interface Clock {
    long currentTimeMillis();
}
`,
      },
      {
        name: "ManualClock.java",
        code: `import java.util.concurrent.atomic.AtomicLong;

public final class ManualClock implements Clock {
    private final AtomicLong millis;

    public ManualClock(long initialMillis) {
        this.millis = new AtomicLong(initialMillis);
    }

    public ManualClock() {
        this(1_700_000_000_000L);
    }

    @Override
    public long currentTimeMillis() {
        return millis.get();
    }

    public void set(long newMillis) {
        millis.set(newMillis);
    }

    public long advanceMillis(long delta) {
        if (delta < 0) throw new IllegalArgumentException("Cannot advance by negative delta");
        return millis.addAndGet(delta);
    }

    public long advanceSeconds(long seconds) {
        return advanceMillis(seconds * 1000L);
    }
}
`,
      },
      {
        name: "PostVisibility.java",
        code: `public enum PostVisibility {
    PUBLIC,
    FOLLOWERS_ONLY,
    PRIVATE
}
`,
      },
      {
        name: "User.java",
        code: `import java.util.Objects;

public final class User {
    private final String id;
    private final String username;
    private final int celebrityThreshold;

    public User(String id, String username, int celebrityThreshold) {
        if (id == null || id.isBlank()) throw new IllegalArgumentException("User id cannot be empty");
        if (username == null || username.isBlank()) throw new IllegalArgumentException("Username cannot be empty");
        this.id = id;
        this.username = username;
        this.celebrityThreshold = Math.max(1, celebrityThreshold);
    }

    public User(String id, String username) {
        this(id, username, 50); // Default threshold of 50 followers to be celebrity
    }

    public String getId() { return id; }
    public String getUsername() { return username; }
    public int getCelebrityThreshold() { return celebrityThreshold; }

    public boolean isCelebrity(int currentFollowerCount) {
        return currentFollowerCount >= celebrityThreshold;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(id, user.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "User{" + id + ", @" + username + "}";
    }
}
`,
      },
      {
        name: "Post.java",
        code: `import java.util.Objects;

public final class Post implements Comparable<Post> {
    private final String id;
    private final String authorId;
    private final String content;
    private final long timestamp;
    private final PostVisibility visibility;
    private final int likesCount;

    public Post(String id, String authorId, String content, long timestamp, PostVisibility visibility, int likesCount) {
        if (id == null || id.isBlank()) throw new IllegalArgumentException("Post id cannot be empty");
        if (authorId == null || authorId.isBlank()) throw new IllegalArgumentException("Author id cannot be empty");
        if (content == null) throw new IllegalArgumentException("Content cannot be null");
        this.id = id;
        this.authorId = authorId;
        this.content = content;
        this.timestamp = timestamp;
        this.visibility = visibility == null ? PostVisibility.PUBLIC : visibility;
        this.likesCount = Math.max(0, likesCount);
    }

    public Post(String id, String authorId, String content, long timestamp, PostVisibility visibility) {
        this(id, authorId, content, timestamp, visibility, 0);
    }

    public Post(String id, String authorId, String content, long timestamp) {
        this(id, authorId, content, timestamp, PostVisibility.PUBLIC, 0);
    }

    public String getId() { return id; }
    public String getAuthorId() { return authorId; }
    public String getContent() { return content; }
    public long getTimestamp() { return timestamp; }
    public PostVisibility getVisibility() { return visibility; }
    public int getLikesCount() { return likesCount; }

    public boolean canView(String viewerId, boolean isFollower) {
        if (authorId.equals(viewerId)) return true;
        return switch (visibility) {
            case PUBLIC -> true;
            case FOLLOWERS_ONLY -> isFollower;
            case PRIVATE -> false;
        };
    }

    @Override
    public int compareTo(Post o) {
        // Reverse chronological: newest first
        if (this.timestamp != o.timestamp) {
            return Long.compare(o.timestamp, this.timestamp);
        }
        return o.id.compareTo(this.id);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Post post = (Post) o;
        return Objects.equals(id, post.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Post{" + id + " by " + authorId + " at " + timestamp + " [" + visibility + "]: \\"" + content + "\\"}";
    }
}
`,
      },
      {
        name: "FollowGraph.java",
        code: `import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public final class FollowGraph {
    // followerId -> Set of followeeIds (who this user follows)
    private final Map<String, Set<String>> following = new ConcurrentHashMap<>();
    // followeeId -> Set of followerIds (who follows this user)
    private final Map<String, Set<String>> followers = new ConcurrentHashMap<>();

    public boolean follow(String followerId, String followeeId) {
        if (followerId == null || followeeId == null || followerId.equals(followeeId)) {
            return false;
        }
        Set<String> followingSet = following.computeIfAbsent(followerId, k -> ConcurrentHashMap.newKeySet());
        Set<String> followerSet = followers.computeIfAbsent(followeeId, k -> ConcurrentHashMap.newKeySet());

        boolean added = followingSet.add(followeeId);
        if (added) {
            followerSet.add(followerId);
        }
        return added;
    }

    public boolean unfollow(String followerId, String followeeId) {
        if (followerId == null || followeeId == null) {
            return false;
        }
        Set<String> followingSet = following.get(followerId);
        Set<String> followerSet = followers.get(followeeId);

        boolean removed = false;
        if (followingSet != null) {
            removed = followingSet.remove(followeeId);
        }
        if (followerSet != null) {
            followerSet.remove(followerId);
        }
        return removed;
    }

    public boolean isFollowing(String followerId, String followeeId) {
        if (followerId == null || followeeId == null) return false;
        Set<String> set = following.get(followerId);
        return set != null && set.contains(followeeId);
    }

    public Set<String> getFollowees(String followerId) {
        Set<String> set = following.get(followerId);
        return set != null ? Collections.unmodifiableSet(set) : Collections.emptySet();
    }

    public Set<String> getFollowers(String followeeId) {
        Set<String> set = followers.get(followeeId);
        return set != null ? Collections.unmodifiableSet(set) : Collections.emptySet();
    }

    public int getFollowerCount(String userId) {
        Set<String> set = followers.get(userId);
        return set != null ? set.size() : 0;
    }

    public int getFollowingCount(String userId) {
        Set<String> set = following.get(userId);
        return set != null ? set.size() : 0;
    }
}
`,
      },
      {
        name: "FeedCursor.java",
        code: `import java.util.Objects;
import java.util.Optional;

public final class FeedCursor {
    private final long timestamp;
    private final String postId;

    public FeedCursor(long timestamp, String postId) {
        if (postId == null || postId.isBlank()) throw new IllegalArgumentException("PostId cannot be empty");
        this.timestamp = timestamp;
        this.postId = postId;
    }

    public long getTimestamp() { return timestamp; }
    public String getPostId() { return postId; }

    public String encode() {
        return timestamp + "_" + postId;
    }

    public static Optional<FeedCursor> decode(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        int idx = token.indexOf('_');
        if (idx <= 0 || idx == token.length() - 1) return Optional.empty();
        try {
            long ts = Long.parseLong(token.substring(0, idx));
            String id = token.substring(idx + 1);
            return Optional.of(new FeedCursor(ts, id));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    public boolean allows(Post post) {
        if (post.getTimestamp() < this.timestamp) {
            return true;
        }
        if (post.getTimestamp() == this.timestamp) {
            return post.getId().compareTo(this.postId) < 0;
        }
        return false;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        FeedCursor that = (FeedCursor) o;
        return timestamp == that.timestamp && Objects.equals(postId, that.postId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(timestamp, postId);
    }

    @Override
    public String toString() {
        return "FeedCursor{" + timestamp + "_" + postId + "}";
    }
}
`,
      },
      {
        name: "FeedPage.java",
        code: `import java.util.Collections;
import java.util.List;
import java.util.Optional;

public final class FeedPage {
    private final List<Post> posts;
    private final String nextCursor;
    private final boolean hasMore;

    public FeedPage(List<Post> posts, String nextCursor, boolean hasMore) {
        this.posts = posts == null ? Collections.emptyList() : List.copyOf(posts);
        this.nextCursor = nextCursor;
        this.hasMore = hasMore;
    }

    public List<Post> getPosts() { return posts; }
    public Optional<String> getNextCursor() { return Optional.ofNullable(nextCursor); }
    public boolean hasMore() { return hasMore; }
    public int size() { return posts.size(); }

    @Override
    public String toString() {
        return "FeedPage{count=" + posts.size() + ", hasMore=" + hasMore + ", nextCursor=" + nextCursor + "}";
    }
}
`,
      },
      {
        name: "FeedService.java",
        code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

public final class FeedService {
    private final Clock clock;
    private final FollowGraph followGraph;
    private final Map<String, User> users = new ConcurrentHashMap<>();
    private final Map<String, Post> posts = new ConcurrentHashMap<>();
    // userId -> list of post IDs delivered to their inbox (push model)
    private final Map<String, List<String>> inboxes = new ConcurrentHashMap<>();
    // authorId -> list of post IDs published by the author (pull model for celebrities & profile)
    private final Map<String, List<String>> outboxes = new ConcurrentHashMap<>();
    private final AtomicLong postSeq = new AtomicLong(1000);

    public FeedService(Clock clock, FollowGraph followGraph) {
        this.clock = Objects.requireNonNull(clock, "clock cannot be null");
        this.followGraph = Objects.requireNonNull(followGraph, "followGraph cannot be null");
    }

    public FeedService(Clock clock) {
        this(clock, new FollowGraph());
    }

    public Clock getClock() { return clock; }
    public FollowGraph getFollowGraph() { return followGraph; }

    public void registerUser(User user) {
        Objects.requireNonNull(user, "User cannot be null");
        users.put(user.getId(), user);
    }

    public Optional<User> getUser(String userId) {
        return Optional.ofNullable(users.get(userId));
    }

    public boolean follow(String followerId, String followeeId) {
        if (!users.containsKey(followerId) || !users.containsKey(followeeId)) {
            return false;
        }
        return followGraph.follow(followerId, followeeId);
    }

    public boolean unfollow(String followerId, String followeeId) {
        return followGraph.unfollow(followerId, followeeId);
    }

    public boolean isCelebrity(String userId) {
        User user = users.get(userId);
        if (user == null) return false;
        return user.isCelebrity(followGraph.getFollowerCount(userId));
    }

    public Post publishPost(String authorId, String content, PostVisibility visibility) {
        User author = users.get(authorId);
        if (author == null) {
            throw new IllegalArgumentException("Author not registered: " + authorId);
        }

        String postId = "post-" + postSeq.incrementAndGet();
        long now = clock.currentTimeMillis();
        Post post = new Post(postId, authorId, content, now, visibility);
        posts.put(postId, post);

        // Always record in author's outbox
        outboxes.computeIfAbsent(authorId, k -> Collections.synchronizedList(new ArrayList<>())).add(postId);

        // Also add to author's own inbox
        inboxes.computeIfAbsent(authorId, k -> Collections.synchronizedList(new ArrayList<>())).add(postId);

        // Fan-out decision: Push vs Pull
        boolean celebrity = isCelebrity(authorId);
        if (!celebrity) {
            // FAN-OUT ON WRITE (Push): Deliver directly to all followers' inboxes
            Set<String> followers = followGraph.getFollowers(authorId);
            for (String followerId : followers) {
                inboxes.computeIfAbsent(followerId, k -> Collections.synchronizedList(new ArrayList<>())).add(postId);
            }
        }
        // If celebrity: FAN-OUT ON READ (Pull): no broadcast push, followers pull on demand

        return post;
    }

    public Post publishPost(String authorId, String content) {
        return publishPost(authorId, content, PostVisibility.PUBLIC);
    }

    public FeedPage getFeed(String userId, String cursorToken, int pageSize) {
        if (!users.containsKey(userId)) {
            return new FeedPage(Collections.emptyList(), null, false);
        }
        if (pageSize <= 0) pageSize = 10;

        Optional<FeedCursor> cursor = FeedCursor.decode(cursorToken);
        Set<String> candidatePostIds = new HashSet<>();

        // 1. Gather posts from user's pre-computed inbox (Push model results)
        List<String> inbox = inboxes.get(userId);
        if (inbox != null) {
            synchronized (inbox) {
                candidatePostIds.addAll(inbox);
            }
        }

        // 2. Fan-out on READ (Pull model): Pull from followed celebrities
        Set<String> followees = followGraph.getFollowees(userId);
        for (String followeeId : followees) {
            if (isCelebrity(followeeId)) {
                List<String> celebrityPosts = outboxes.get(followeeId);
                if (celebrityPosts != null) {
                    synchronized (celebrityPosts) {
                        candidatePostIds.addAll(celebrityPosts);
                    }
                }
            }
        }

        // 3. Resolve, filter, and sort candidates
        List<Post> visiblePosts = new ArrayList<>();
        for (String pid : candidatePostIds) {
            Post post = posts.get(pid);
            if (post == null) continue;

            String authorId = post.getAuthorId();
            boolean isSelf = authorId.equals(userId);
            boolean isFollower = followGraph.isFollowing(userId, authorId);

            // Stale push filter: if user unfollowed the author, do not show
            if (!isSelf && !isFollower) {
                continue;
            }

            // Privacy filter
            if (!post.canView(userId, isFollower)) {
                continue;
            }

            // Cursor filter
            if (cursor.isPresent() && !cursor.get().allows(post)) {
                continue;
            }

            visiblePosts.add(post);
        }

        // 4. Sort in reverse chronological order
        Collections.sort(visiblePosts);

        // 5. Paginate
        boolean hasMore = visiblePosts.size() > pageSize;
        List<Post> pageItems = visiblePosts.subList(0, Math.min(pageSize, visiblePosts.size()));

        String nextCursor = null;
        if (hasMore && !pageItems.isEmpty()) {
            Post last = pageItems.get(pageItems.size() - 1);
            nextCursor = new FeedCursor(last.getTimestamp(), last.getId()).encode();
        }

        return new FeedPage(pageItems, nextCursor, hasMore);
    }

    public FeedPage getUserTimeline(String authorId, String viewerId, String cursorToken, int pageSize) {
        if (!users.containsKey(authorId)) {
            return new FeedPage(Collections.emptyList(), null, false);
        }
        if (pageSize <= 0) pageSize = 10;

        Optional<FeedCursor> cursor = FeedCursor.decode(cursorToken);
        List<String> authorPosts = outboxes.get(authorId);
        List<Post> visible = new ArrayList<>();

        if (authorPosts != null) {
            boolean isFollower = followGraph.isFollowing(viewerId, authorId);
            synchronized (authorPosts) {
                for (String pid : authorPosts) {
                    Post post = posts.get(pid);
                    if (post != null && post.canView(viewerId, isFollower)) {
                        if (cursor.isEmpty() || cursor.get().allows(post)) {
                            visible.add(post);
                        }
                    }
                }
            }
        }

        Collections.sort(visible);
        boolean hasMore = visible.size() > pageSize;
        List<Post> pageItems = visible.subList(0, Math.min(pageSize, visible.size()));

        String nextCursor = null;
        if (hasMore && !pageItems.isEmpty()) {
            Post last = pageItems.get(pageItems.size() - 1);
            nextCursor = new FeedCursor(last.getTimestamp(), last.getId()).encode();
        }

        return new FeedPage(pageItems, nextCursor, hasMore);
    }

    public int getInboxSize(String userId) {
        List<String> list = inboxes.get(userId);
        return list != null ? list.size() : 0;
    }

    public Optional<Post> getPost(String postId) {
        return Optional.ofNullable(posts.get(postId));
    }
}
`,
      },
      {
        name: "Main.java",
        code: `public class Main {
    public static void main(String[] args) {
        ManualClock clock = new ManualClock(1_700_000_000_000L);
        FeedService service = new FeedService(clock);

        // 1. Setup users: Dave has celebrity threshold of 2 followers
        User alice = new User("usr-alice", "alice", 100);
        User bob = new User("usr-bob", "bob", 100);
        User charlie = new User("usr-charlie", "charlie", 100);
        User dave = new User("usr-dave", "dave_celebrity", 2);

        service.registerUser(alice);
        service.registerUser(bob);
        service.registerUser(charlie);
        service.registerUser(dave);

        System.out.println("Registered 4 users (Dave has celebrity threshold = 2)");

        // 2. Follow relationships
        service.follow("usr-alice", "usr-charlie");
        service.follow("usr-bob", "usr-charlie");
        service.follow("usr-alice", "usr-dave");
        service.follow("usr-bob", "usr-dave");

        System.out.println("Alice follows Charlie & Dave");
        System.out.println("Dave follower count: " + service.getFollowGraph().getFollowerCount("usr-dave") +
                ", isCelebrity=" + service.isCelebrity("usr-dave"));

        // 3. Regular user Charlie posts -> Fan-out on WRITE
        clock.advanceSeconds(10);
        Post p1 = service.publishPost("usr-charlie", "Hello world from Charlie!");
        System.out.println("Charlie (regular) published p1: " + p1.getId());
        System.out.println("Alice inbox count after Charlie's post: " + service.getInboxSize("usr-alice"));
        System.out.println("Bob inbox count after Charlie's post: " + service.getInboxSize("usr-bob"));

        // 4. Celebrity Dave posts -> Fan-out on READ (no push to follower inboxes)
        int aliceInboxBefore = service.getInboxSize("usr-alice");
        clock.advanceSeconds(10);
        Post p2 = service.publishPost("usr-dave", "Exciting announcement from Dave!");
        System.out.println("Dave (celebrity) published p2: " + p2.getId());
        System.out.println("Alice inbox count after Dave's post: " + service.getInboxSize("usr-alice") +
                " (unchanged: " + (service.getInboxSize("usr-alice") == aliceInboxBefore) + ")");

        // 5. Alice retrieves feed -> pull-merges Charlie's pushed post and Dave's outbox post
        clock.advanceSeconds(10);
        FeedPage page1 = service.getFeed("usr-alice", null, 10);
        System.out.println("Alice feed total posts: " + page1.size());
        for (Post p : page1.getPosts()) {
            System.out.println(" - " + p.getAuthorId() + ": " + p.getContent());
        }

        // 6. Pagination with cursor
        clock.advanceSeconds(10);
        service.publishPost("usr-charlie", "Charlie's second post");
        clock.advanceSeconds(10);
        service.publishPost("usr-dave", "Dave's second announcement");

        FeedPage firstPage = service.getFeed("usr-alice", null, 2);
        System.out.println("Feed Page 1 items: " + firstPage.size() + ", hasMore=" + firstPage.hasMore());
        String nextCursor = firstPage.getNextCursor().orElse(null);
        System.out.println("Next cursor: " + nextCursor);

        FeedPage secondPage = service.getFeed("usr-alice", nextCursor, 2);
        System.out.println("Feed Page 2 items: " + secondPage.size() + ", hasMore=" + secondPage.hasMore());

        // 7. Unfollow dynamic cleanup
        service.unfollow("usr-alice", "usr-charlie");
        FeedPage pageAfterUnfollow = service.getFeed("usr-alice", null, 10);
        boolean containsCharlie = pageAfterUnfollow.getPosts().stream().anyMatch(p -> p.getAuthorId().equals("usr-charlie"));
        System.out.println("Feed contains Charlie after unfollow: " + containsCharlie);
    }
}
`,
      },
    ],
    tests: [
      {
        name: "Tests.java",
        code: `import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

public class Tests {
    private static int checks = 0;

    private static void check(boolean condition, String message) {
        checks++;
        if (!condition) {
            throw new AssertionError("FAIL: " + message);
        }
    }

    public static void main(String[] args) throws Exception {
        testFollowUnfollowGraph();
        testFanOutOnWriteForRegularUsers();
        testFanOutOnReadForCelebrityUsers();
        testFeedOrderReverseChronological();
        testCursorPagination();
        testPrivacyVisibilityFilters();
        testUnfollowRemovesPostsFromFeed();
        testCelebrityThresholdTransition();
        testConcurrentPostingAndFeedReads();

        System.out.println("PASS: all " + checks + " checks passed");
    }

    private static void testFollowUnfollowGraph() {
        FollowGraph fg = new FollowGraph();
        check(!fg.follow("u1", "u1"), "self-follow rejected");
        check(fg.follow("u1", "u2"), "u1 follows u2");
        check(!fg.follow("u1", "u2"), "duplicate follow returns false");
        check(fg.isFollowing("u1", "u2"), "u1 is following u2");
        check(!fg.isFollowing("u2", "u1"), "u2 is not following u1");
        check(fg.getFollowerCount("u2") == 1, "u2 has 1 follower");
        check(fg.getFollowingCount("u1") == 1, "u1 is following 1 user");

        check(fg.unfollow("u1", "u2"), "unfollow returns true");
        check(!fg.isFollowing("u1", "u2"), "u1 no longer follows u2");
        check(fg.getFollowerCount("u2") == 0, "u2 has 0 followers");
    }

    private static void testFanOutOnWriteForRegularUsers() {
        ManualClock clock = new ManualClock(1000L);
        FeedService service = new FeedService(clock);
        service.registerUser(new User("author", "author", 50));
        service.registerUser(new User("f1", "f1", 50));
        service.registerUser(new User("f2", "f2", 50));

        service.follow("f1", "author");
        service.follow("f2", "author");

        check(service.getInboxSize("f1") == 0, "f1 inbox initially empty");
        check(service.getInboxSize("f2") == 0, "f2 inbox initially empty");

        Post post = service.publishPost("author", "Post from regular user");
        check(service.getInboxSize("f1") == 1, "post pushed to f1 inbox");
        check(service.getInboxSize("f2") == 1, "post pushed to f2 inbox");

        FeedPage feed = service.getFeed("f1", null, 10);
        check(feed.size() == 1, "f1 feed has 1 post");
        check(feed.getPosts().get(0).getId().equals(post.getId()), "f1 feed contains published post");
    }

    private static void testFanOutOnReadForCelebrityUsers() {
        ManualClock clock = new ManualClock(1000L);
        FeedService service = new FeedService(clock);
        // Celebrity threshold is 2 followers
        service.registerUser(new User("celeb", "celeb", 2));
        service.registerUser(new User("f1", "f1", 50));
        service.registerUser(new User("f2", "f2", 50));

        service.follow("f1", "celeb");
        service.follow("f2", "celeb");

        check(service.isCelebrity("celeb"), "celeb is identified as celebrity");

        Post post = service.publishPost("celeb", "Post from celebrity");
        // Must NOT push to follower inboxes
        check(service.getInboxSize("f1") == 0, "celeb post NOT pushed to f1 inbox");
        check(service.getInboxSize("f2") == 0, "celeb post NOT pushed to f2 inbox");

        // But reading the feed dynamically pulls it!
        FeedPage feed1 = service.getFeed("f1", null, 10);
        check(feed1.size() == 1, "f1 pulls celeb post on read");
        check(feed1.getPosts().get(0).getId().equals(post.getId()), "pulled post matches celeb post");

        FeedPage feed2 = service.getFeed("f2", null, 10);
        check(feed2.size() == 1, "f2 pulls celeb post on read");
    }

    private static void testFeedOrderReverseChronological() {
        ManualClock clock = new ManualClock(1000L);
        FeedService service = new FeedService(clock);
        service.registerUser(new User("u1", "u1", 100));
        service.registerUser(new User("u2", "u2", 100));
        service.follow("u1", "u2");

        clock.advanceSeconds(10);
        Post p1 = service.publishPost("u2", "First post");
        clock.advanceSeconds(10);
        Post p2 = service.publishPost("u2", "Second post");
        clock.advanceSeconds(10);
        Post p3 = service.publishPost("u2", "Third post");

        FeedPage feed = service.getFeed("u1", null, 10);
        check(feed.size() == 3, "feed has 3 posts");
        check(feed.getPosts().get(0).getId().equals(p3.getId()), "most recent post first");
        check(feed.getPosts().get(1).getId().equals(p2.getId()), "second post in middle");
        check(feed.getPosts().get(2).getId().equals(p1.getId()), "oldest post last");
    }

    private static void testCursorPagination() {
        ManualClock clock = new ManualClock(1000L);
        FeedService service = new FeedService(clock);
        service.registerUser(new User("viewer", "viewer", 100));
        service.registerUser(new User("author", "author", 100));
        service.follow("viewer", "author");

        List<String> createdPostIds = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            clock.advanceSeconds(5);
            Post p = service.publishPost("author", "Item #" + i);
            createdPostIds.add(p.getId());
        }

        // Fetch page by page with pageSize = 3
        List<Post> collected = new ArrayList<>();
        String cursor = null;
        int pages = 0;

        while (true) {
            FeedPage page = service.getFeed("viewer", cursor, 3);
            pages++;
            collected.addAll(page.getPosts());
            if (!page.hasMore()) {
                break;
            }
            check(page.getNextCursor().isPresent(), "hasMore is true implies nextCursor is present");
            cursor = page.getNextCursor().get();
        }

        check(pages == 3, "7 items with pageSize 3 took 3 pages: 3 + 3 + 1, got " + pages);
        check(collected.size() == 7, "collected exactly 7 posts");

        // Verify uniqueness
        Set<String> uniqueIds = new HashSet<>();
        for (Post p : collected) {
            uniqueIds.add(p.getId());
        }
        check(uniqueIds.size() == 7, "all 7 posts are distinct, no duplicates across cursor pages");

        // Verify reverse chronological ordering in collected list
        for (int i = 0; i < collected.size() - 1; i++) {
            Post curr = collected.get(i);
            Post next = collected.get(i + 1);
            check(curr.getTimestamp() >= next.getTimestamp(), "properly ordered across pages");
        }
    }

    private static void testPrivacyVisibilityFilters() {
        ManualClock clock = new ManualClock(1000L);
        FeedService service = new FeedService(clock);
        service.registerUser(new User("author", "author", 100));
        service.registerUser(new User("follower", "follower", 100));
        service.registerUser(new User("stranger", "stranger", 100));

        service.follow("follower", "author");

        clock.advanceSeconds(5);
        Post pub = service.publishPost("author", "Public post", PostVisibility.PUBLIC);
        clock.advanceSeconds(5);
        Post fol = service.publishPost("author", "Followers only post", PostVisibility.FOLLOWERS_ONLY);
        clock.advanceSeconds(5);
        Post priv = service.publishPost("author", "Private diary", PostVisibility.PRIVATE);

        // Follower's feed should see PUBLIC and FOLLOWERS_ONLY, but NOT PRIVATE
        FeedPage followerFeed = service.getFeed("follower", null, 10);
        List<String> followerPostIds = followerFeed.getPosts().stream().map(Post::getId).toList();
        check(followerPostIds.contains(pub.getId()), "follower sees public");
        check(followerPostIds.contains(fol.getId()), "follower sees followers-only");
        check(!followerPostIds.contains(priv.getId()), "follower DOES NOT see private");

        // Stranger's feed should not see author posts (stranger does not follow author)
        FeedPage strangerFeed = service.getFeed("stranger", null, 10);
        check(strangerFeed.size() == 0, "stranger sees nothing from author in home feed");

        // Author's own feed should see all their own posts including private
        FeedPage authorFeed = service.getFeed("author", null, 10);
        List<String> authorPostIds = authorFeed.getPosts().stream().map(Post::getId).toList();
        check(authorPostIds.contains(pub.getId()), "author sees own public");
        check(authorPostIds.contains(fol.getId()), "author sees own followers-only");
        check(authorPostIds.contains(priv.getId()), "author sees own private");
    }

    private static void testUnfollowRemovesPostsFromFeed() {
        ManualClock clock = new ManualClock(1000L);
        FeedService service = new FeedService(clock);
        service.registerUser(new User("u1", "u1", 100));
        service.registerUser(new User("u2", "u2", 100));
        service.follow("u1", "u2");

        Post p = service.publishPost("u2", "You will miss this when unfollowed");
        check(service.getFeed("u1", null, 10).size() == 1, "feed initially contains post");

        service.unfollow("u1", "u2");
        check(service.getFeed("u1", null, 10).size() == 0, "post filtered out after unfollowing");
    }

    private static void testCelebrityThresholdTransition() {
        ManualClock clock = new ManualClock(1000L);
        FeedService service = new FeedService(clock);
        // Celebrity threshold = 3
        service.registerUser(new User("rising_star", "rising_star", 3));
        service.registerUser(new User("f1", "f1", 100));
        service.registerUser(new User("f2", "f2", 100));
        service.registerUser(new User("f3", "f3", 100));

        service.follow("f1", "rising_star");
        service.follow("f2", "rising_star");

        check(!service.isCelebrity("rising_star"), "not celebrity with 2 followers");

        // Post as regular user -> pushed to inboxes
        Post p1 = service.publishPost("rising_star", "My indie song");
        check(service.getInboxSize("f1") == 1, "p1 pushed to f1");
        check(service.getInboxSize("f2") == 1, "p1 pushed to f2");

        // 3rd follower joins -> reaches threshold 3
        service.follow("f3", "rising_star");
        check(service.isCelebrity("rising_star"), "now a celebrity with 3 followers");

        // Post as celebrity -> NOT pushed to inboxes!
        Post p2 = service.publishPost("rising_star", "Hit #1 on charts!");
        check(service.getInboxSize("f1") == 1, "p2 NOT pushed to f1 inbox (still 1)");
        check(service.getInboxSize("f2") == 1, "p2 NOT pushed to f2 inbox (still 1)");
        check(service.getInboxSize("f3") == 0, "p2 NOT pushed to f3 inbox (0)");

        // All 3 followers still see the celebrity post when querying their feed!
        FeedPage f1Feed = service.getFeed("f1", null, 10);
        check(f1Feed.size() == 2, "f1 sees both p1 (push) and p2 (pull)");
        FeedPage f3Feed = service.getFeed("f3", null, 10);
        check(f3Feed.getPosts().stream().anyMatch(p -> p.getId().equals(p2.getId())), "f3 sees p2 (pull)");
        check(f3Feed.size() == 2, "f3 pulls all recent celebrity posts from outbox");
    }

    private static void testConcurrentPostingAndFeedReads() throws Exception {
        ManualClock clock = new ManualClock(1000L);
        FeedService service = new FeedService(clock);

        int authorCount = 5;
        int viewerCount = 5;
        for (int i = 0; i < authorCount; i++) {
            service.registerUser(new User("author-" + i, "author-" + i, 50));
        }
        for (int i = 0; i < viewerCount; i++) {
            service.registerUser(new User("viewer-" + i, "viewer-" + i, 50));
            // Each viewer follows all authors
            for (int a = 0; a < authorCount; a++) {
                service.follow("viewer-" + i, "author-" + a);
            }
        }

        int threads = 10;
        ExecutorService exec = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);
        AtomicInteger totalPostsPublished = new AtomicInteger(0);

        // 5 author threads publishing 10 posts each
        for (int i = 0; i < 5; i++) {
            final String authorId = "author-" + i;
            exec.submit(() -> {
                try {
                    startLatch.await();
                    for (int p = 0; p < 10; p++) {
                        service.publishPost(authorId, "Concurrent message " + p);
                        totalPostsPublished.incrementAndGet();
                    }
                } catch (Exception ignored) {
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // 5 viewer threads reading feeds
        for (int i = 0; i < 5; i++) {
            final String viewerId = "viewer-" + i;
            exec.submit(() -> {
                try {
                    startLatch.await();
                    for (int r = 0; r < 10; r++) {
                        FeedPage page = service.getFeed(viewerId, null, 10);
                        check(page.getPosts() != null, "feed posts not null");
                    }
                } catch (Exception ignored) {
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        doneLatch.await();
        exec.shutdown();

        check(totalPostsPublished.get() == 50, "50 total posts published concurrently");
        FeedPage viewer0Feed = service.getFeed("viewer-0", null, 100);
        check(viewer0Feed.size() == 50, "viewer-0 received all 50 posts");
    }
}
`,
      },
    ],
    expectedOutput: [
      "Registered 4 users (Dave has celebrity threshold = 2)",
      "Alice follows Charlie & Dave",
      "Dave follower count: 2, isCelebrity=true",
      "Charlie (regular) published p1: post-1001",
      "Alice inbox count after Charlie's post: 1",
      "Bob inbox count after Charlie's post: 1",
      "Dave (celebrity) published p2: post-1002",
      "Alice inbox count after Dave's post: 1 (unchanged: true)",
      "Alice feed total posts: 2",
      " - usr-dave: Exciting announcement from Dave!",
      " - usr-charlie: Hello world from Charlie!",
      "Feed Page 1 items: 2, hasMore=true",
      "Next cursor: 1700000040000_post-1003",
      "Feed Page 2 items: 2, hasMore=false",
      "Feed contains Charlie after unfollow: false",
    ],
  },
};
