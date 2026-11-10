import { describe, expect, it } from "vitest";
import { runJavaProject } from "./run-project";

describe("runJavaProject (Java Multi-File IDE Backend Runner)", () => {
  it("compiles and runs across multiple files with inheritance and method calls", async () => {
    const files = {
      "Vehicle.java": `
public abstract class Vehicle {
    protected String plate;
    public Vehicle(String plate) { this.plate = plate; }
    public abstract String describe();
    public String getPlate() { return plate; }
}
`.trim(),
      "Car.java": `
public class Car extends Vehicle {
    public Car(String plate) { super(plate); }
    @Override
    public String describe() {
        return "Car [" + getPlate() + "]";
    }
}
`.trim(),
      "Main.java": `
public class Main {
    public static void main(String[] args) {
        Vehicle v = new Car("KA-01-9999");
        System.out.println(v.describe());
    }
}
`.trim(),
    };

    const result = await runJavaProject({ files });

    expect(result.status).toBe("compiled_and_ran");
    expect(result.success).toBe(true);
    expect(result.output.trim()).toBe("Car [KA-01-9999]");
    expect(result.elapsedMs).toBeGreaterThan(0);
  });

  it("reports compilation errors with exact file and line numbers in diagnostics", async () => {
    const files = {
      "Vehicle.java": `public class Vehicle {
    public void start() {
        int x = ;
    }
}`,
      "Main.java": `public class Main {
    public static void main(String[] args) {
        Vehicle v = new Vehicle();
        v.start();
    }
}`,
    };

    const result = await runJavaProject({ files });

    expect(result.status).toBe("compile_error");
    expect(result.success).toBe(false);
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics!.length).toBeGreaterThan(0);

    const vehicleDiag = result.diagnostics!.find((d) => d.file === "Vehicle.java");
    expect(vehicleDiag).toBeDefined();
    expect(vehicleDiag!.line).toBe(3);
    expect(vehicleDiag!.message.length).toBeGreaterThan(0);
  });

  it("captures runtime errors and exception stack traces", async () => {
    const files = {
      "Main.java": `
public class Main {
    public static void main(String[] args) {
        String nullStr = null;
        System.out.println(nullStr.length());
    }
}
`.trim(),
    };

    const result = await runJavaProject({ files });

    expect(result.status).toBe("runtime_error");
    expect(result.success).toBe(false);
    expect(result.output).toContain("NullPointerException");
  });

  it("terminates runaway programs with TLE status when timeout is reached", async () => {
    const files = {
      "Main.java": `
public class Main {
    public static void main(String[] args) {
        System.out.println("Starting loop...");
        while (true) {
            // Runaway infinite loop
        }
    }
}
`.trim(),
    };

    const result = await runJavaProject({ files, timeoutMs: 1500 });

    expect(result.status).toBe("tle");
    expect(result.success).toBe(false);
    expect(result.output).toContain("Time Limit Exceeded");
    expect(result.elapsedMs).toBeGreaterThanOrEqual(1400);
  });

  it("supports passing standard input to the running program", async () => {
    const files = {
      "Main.java": `
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String name = sc.nextLine();
        System.out.println("Hello, " + name + "!");
    }
}
`.trim(),
    };

    const result = await runJavaProject({ files, input: "HabbitManager" });

    expect(result.status).toBe("compiled_and_ran");
    expect(result.success).toBe(true);
    expect(result.output.trim()).toBe("Hello, HabbitManager!");
  });

  it("supports running an arbitrary mainClass", async () => {
    const files = {
      "CustomRunner.java": `
public class CustomRunner {
    public static void main(String[] args) {
        System.out.println("Ran custom runner!");
    }
}
`.trim(),
    };

    const result = await runJavaProject({ files, mainClass: "CustomRunner" });

    expect(result.status).toBe("compiled_and_ran");
    expect(result.success).toBe(true);
    expect(result.output.trim()).toBe("Ran custom runner!");
  });
});
