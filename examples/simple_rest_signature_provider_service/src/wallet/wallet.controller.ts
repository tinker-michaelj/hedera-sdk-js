import {
    Controller,
    Post,
    Res,
    Body,
    HttpStatus,
    HttpCode,
    Logger,
} from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { AccountId } from "@hashgraph/sdk";
import { WalletDto } from "./wallet.dto";
import { SignDto } from "./sign.dto";
import { CallbackDto } from "./callback.dto";
import { Response } from "express";

@Controller("wallet")
export class WalletController {
    private readonly logger = new Logger(WalletController.name);

    constructor(public readonly walletService: WalletService) {}

    @Post("/connect")
    connect(@Res() res: Response, @Body() body: WalletDto) {
        // TODO: Support multiple wallets
        if (
            body.accountId != null &&
            AccountId.fromString(body.accountId).toString() !==
                this.walletService.wallet.getAccountId().toString()
        ) {
            return res.status(HttpStatus.BAD_REQUEST).send();
        }

        const accountId = this.walletService.wallet.getAccountId();
        const accountKey = this.walletService.wallet.getAccountKey();
        const network: Record<string, AccountId | string> =
            this.walletService.wallet.getNetwork();
        const mirrorNetwork = this.walletService.wallet.getMirrorNetwork();
        const ledgerId = this.walletService.wallet.getLedgerId();

        const net: Record<string, string> = {};

        for (const key of Object.keys(network)) {
            net[key] = network[key].toString();
        }

        res.status(HttpStatus.OK).send({
            accountId: accountId.toString(),
            accountKey: accountKey.toString(),
            network: net,
            mirrorNetwork,
            ledgerId: ledgerId != null ? ledgerId.toString() : null,
        });
    }

    @Post("/sign")
    @HttpCode(200)
    async sign(@Body() body: SignDto) {
        const bytes = body.bytes.map((text) => Buffer.from(text, "hex"));
        const response = await this.walletService.wallet.sign(bytes);

        return {
            response: response.map((signature) => signature.toJSON()),
        };
    }

    /**
     * Not part of the standard API, this is strictly used for TCK testing.
     * If a real implementation this method should sit behind a testing flag.
     */
    @Post("/callback")
    @HttpCode(200)
    async callback(@Body() body: CallbackDto) {
        this.logger.debug(
            `/callback ${Buffer.from(body.request).toString("hex")}`,
        );

        this.walletService.allowedRequests.add(
            Buffer.from(body.request).toString("hex"),
        );
    }
}