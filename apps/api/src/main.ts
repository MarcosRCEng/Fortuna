import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import "reflect-metadata";
import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = (
    process.env.WEB_APP_URL ??
    process.env.WEB_ORIGIN ??
    "http://localhost:5173"
  )
    .split(",")
    .map((origin) => origin.trim());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle("Fortuna API")
    .setDescription("Fortuna financial education platform API.")
    .setVersion("0.1.0")
    .addTag("auth", "Autenticacao Google OAuth e sessao.")
    .addTag("me", "Rotas autenticadas do jogador atual.")
    .addTag("players", "Jogadores, carteira, ordens e historico.")
    .addTag("assets", "Catalogo mockado de ativos.")
    .addTag("market", "Cotacoes mockadas de mercado.")
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("docs", app, document);

  const port = Number.parseInt(process.env.API_PORT ?? "3000", 10);
  await app.listen(port);
}

void bootstrap();
