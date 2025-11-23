import { Module } from "@nestjs/common";
import { UserModule } from "../user/user.module";
import { BotUpdate } from "./bot.update";
import { ProductTypeModule } from "../product-types/product-type.module";
import { ProductModule } from "../products/product.module";
import { ProductBrandModule } from "../product-brend/product-brend.module";

@Module({
  imports: [UserModule, ProductTypeModule, ProductModule, ProductBrandModule],
  providers: [BotUpdate],
})
export class BotModule {}
