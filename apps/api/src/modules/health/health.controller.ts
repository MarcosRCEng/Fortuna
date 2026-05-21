import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

export interface HealthResponse {
  status: "ok";
  service: "fortuna-api";
}

@ApiTags("health")
@Controller(["health", "api/v1/health"])
export class HealthController {
  @Get()
  @ApiOkResponse({ description: "API health status." })
  getHealth(): HealthResponse {
    return {
      status: "ok",
      service: "fortuna-api",
    };
  }
}
