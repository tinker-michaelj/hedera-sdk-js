import AccountCreateTransaction from "../src/account/AccountCreateTransaction";
import AccountDeleteTransaction from "../src/account/AccountDeleteTransaction";
import AccountInfoQuery from "../src/account/AccountInfoQuery";
import TransactionReceiptQuery from "../src/TransactionReceiptQuery";
import Hbar from "../src/Hbar";
import TransactionId from "../src/TransactionId";
import newClient from "./IntegrationClient";
import Long from "long";
import { PrivateKey } from "../src/index";

describe("AccountCreate", function () {
    it("should be executable", async function () {
        this.timeout(10000);

        const client = newClient();
        const operatorId = client.getOperatorId();
        const key = PrivateKey.generate();

        const response = await new AccountCreateTransaction()
            .setKey(key.getPublicKey())
            .setMaxTransactionFee(new Hbar(2))
            .setInitialBalance(new Hbar(1))
            .execute(client);

        const receipt = await new TransactionReceiptQuery()
            .setNodeId(response.nodeId)
            .setTransactionId(response.transactionId)
            .execute(client);

        expect(receipt.accountId).to.not.be.null;
        const account = receipt.accountId;

        const info = await new AccountInfoQuery()
            .setNodeId(response.nodeId)
            .setAccountId(account)
            .execute(client);

        expect(info.accountId.toString()).to.be.equal(account.toString());
        expect(info.isDeleted).to.be.false;
        expect(info.key.toString()).to.be.equal(key.getPublicKey().toString());
        expect(info.balance.toTinybars().toInt()).to.be.equal(
            new Hbar(1).toTinybars().toInt()
        );
        expect(info.autoRenewPeriod.toInt()).to.be.equal(7776000);
        expect(info.receiveRecordThreshold.toTinybars().toInt()).to.be.equal(
            Long.MAX_VALUE.toInt()
        );
        expect(info.sendRecordThreshold.toTinybars().toInt()).to.be.equal(
            Long.MAX_VALUE.toInt()
        );
        expect(info.proxyAccountId).to.be.null;
        expect(info.proxyReceived.toTinybars().toInt()).to.be.equal(0);

        const id = (
            await (
                await new AccountDeleteTransaction()
                    .setAccountId(account)
                    .setNodeId(response.nodeId)
                    .setTransferAccountId(operatorId)
                    .setTransactionId(TransactionId.generate(account))
                    .freezeWith(client)
                    .sign(key)
            ).execute(client)
        ).transactionId;

        await new TransactionReceiptQuery()
            .setNodeId(response.nodeId)
            .setTransactionId(id)
            .execute(client);
    });
});