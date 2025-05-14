package app.hopps.fin;

import io.quarkiverse.openfga.client.AuthorizationModelClient;
import io.quarkiverse.openfga.client.StoreClient;
import io.quarkiverse.openfga.client.model.ConditionalTupleKey;
import io.quarkiverse.openfga.client.model.Tuple;
import io.quarkiverse.openfga.client.model.TupleKey;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
public class OpenFgaModelTest {

    @Inject
    StoreClient storeClient;

    @Inject
    AuthorizationModelClient authModel;

    @BeforeEach
    public void reset() {
        // delete all tuples
        List<Tuple> tuples = authModel.readAllTuples().await().indefinitely();
        if (!tuples.isEmpty()) {
            List<TupleKey> tupleKeys = tuples.stream()
                    .map(Tuple::getKey)
                    .map(ConditionalTupleKey::withoutCondition)
                    .toList();

            authModel.write(List.of(), tupleKeys).await().indefinitely();
        }
    }

    @Test
    public void insertingObjectsWorks() {
        authModel.write(List.of(
                TupleKey.of("organisation:hopps", "owner", "user:emilia").nullCondition(),
                        TupleKey.of("bommel:op_paf", "part_of", "organisation:hopps").nullCondition(),
                        TupleKey.of("transaction_record:one", "assigned_to", "bommel:op_paf").nullCondition(),
                        TupleKey.of("transaction_record:one", "created_by", "user:emilia").nullCondition()), List.of())
                .await()
                .indefinitely();
    }

    @Test
    public void memberCanSeeAllBommels() {
        // given
        authModel.write(List.of(
                TupleKey.of("organisation:hopps", "member", "user:emilia").nullCondition(),
                TupleKey.of("bommel:op_paf", "part_of", "organisation:hopps").nullCondition(),
                TupleKey.of("bommel:hopps", "parent", "bommel:op_paf").nullCondition() // op_paf is parent of hopps
        ), List.of()).await().indefinitely();

        // when
        boolean canSeeOpPaf = authModel.check(TupleKey.of("bommel:op_paf", "can_see", "user:emilia"))
                .await()
                .indefinitely();
        boolean canSeeHopps = authModel.check(TupleKey.of("bommel:hopps", "can_see", "user:emilia"))
                .await()
                .indefinitely();

        // then
        assertTrue(canSeeOpPaf, "User should be able to see the op_paf bommel");
        assertTrue(canSeeHopps,
                "User should be able to see the hopps bommel through its parent relation to the op_paf bommel");
    }

    @Test
    public void onlyOwnerAndBommelwartCanModifyBommel() {
        // given
        authModel.write(List.of(
                        TupleKey.of("organisation:hopps", "member", "user:regularuser").nullCondition(),
                        TupleKey.of("organisation:hopps", "member", "user:somebommelwart").nullCondition(),
                        TupleKey.of("organisation:hopps", "owner", "user:myowner").nullCondition(),
                        TupleKey.of("bommel:op_paf", "part_of", "organisation:hopps").nullCondition(),
                        TupleKey.of("bommel:op_paf", "bommelwart", "user:somebommelwart").nullCondition()), List.of())
                .await()
                .indefinitely();

        // when
        boolean regularUser = authModel.check(TupleKey.of("bommel:op_paf", "can_modify", "user:regularuser"))
                .await()
                .indefinitely();
        boolean owner = authModel.check(TupleKey.of("bommel:op_paf", "can_modify", "user:myowner"))
                .await()
                .indefinitely();
        boolean bommelwart = authModel.check(TupleKey.of("bommel:op_paf", "can_modify", "user:somebommelwart"))
                .await()
                .indefinitely();

        // then
        assertFalse(regularUser, "Regular user should not be able to modify bommel");
        assertTrue(owner, "Owner should be able to modify all bommels");
        assertTrue(bommelwart, "Bommelwart should be able to modify its bommel");
    }

    @Test
    @DisplayName("bommelwart can only modify bommels under their bommel")
    public void bommelwartCanOnlyModifyBommelsUnderTheirBommel() {
        // given
        authModel.write(List.of(
                        TupleKey.of("organisation:hopps", "member", "user:somebommelwart").nullCondition(),
                        TupleKey.of("bommel:op_paf", "part_of", "organisation:hopps").nullCondition(),
                        TupleKey.of("bommel:hopps", "parent", "bommel:op_paf").nullCondition(), // op_paf is parent of hopps
                        TupleKey.of("bommel:child", "parent", "bommel:hopps").nullCondition(), // hopps is parent of child
                        TupleKey.of("bommel:hopps", "bommelwart", "user:somebommelwart").nullCondition()), List.of())
                .await()
                .indefinitely();

        // when
        boolean canModifyOpPaf = authModel.check(TupleKey.of("bommel:op_paf", "can_modify", "user:somebommelwart"))
                .await()
                .indefinitely();
        boolean canModifyHopps = authModel.check(TupleKey.of("bommel:hopps", "can_modify", "user:somebommelwart"))
                .await()
                .indefinitely();
        boolean canModifyChild = authModel.check(TupleKey.of("bommel:child", "can_modify", "user:somebommelwart"))
                .await()
                .indefinitely();

        // then
        assertFalse(canModifyOpPaf, "Bommelwart should not be able to modify parent of their bommel");
        assertTrue(canModifyHopps, "Bommelwart should be able to modify their own bommel");
        assertTrue(canModifyChild, "Bommelwart should be able to modify children of their own bommel");
    }

    @Test
    public void userCannotSeeOtherOrganizations() {
        // given
        authModel.write(List.of(
                        TupleKey.of("organisation:hopps", "member", "user:abigail").nullCondition(),
                        TupleKey.of("organisation:two", "member", "user:bridget").nullCondition(),
                        TupleKey.of("bommel:op_paf", "part_of", "organisation:hopps").nullCondition(),
                        TupleKey.of("bommel:two", "part_of", "organisation:two").nullCondition()), List.of())
                .await()
                .indefinitely();

        // when
        boolean canSeeOwnBommel = authModel.check(TupleKey.of("bommel:op_paf", "can_see", "user:abigail"))
                .await()
                .indefinitely();
        boolean canSeeOtherOrgBommel = authModel.check(TupleKey.of("bommel:two", "can_see", "user:abigail"))
                .await()
                .indefinitely();

        // then
        assertTrue(canSeeOwnBommel, "User can see bommel in their own org");
        assertFalse(canSeeOtherOrgBommel, "User should not be able to see bommels in other orgs");
    }

    @Test
    @DisplayName("User cannot (by default) see all transaction records")
    public void userCannotSeeAllTransactionRecords() {
        // given
        authModel.write(List.of(
                        TupleKey.of("organisation:hopps", "member", "user:emilia").nullCondition(),
                        TupleKey.of("bommel:op_paf", "part_of", "organisation:hopps").nullCondition(),
                        TupleKey.of("transaction_record:one", "assigned_to", "bommel:op_paf").nullCondition()), List.of())
                .await()
                .indefinitely();

        // when
        boolean canSeeTransactionRecord = authModel
                .check(TupleKey.of("transaction_record:one", "can_see", "user:emilia"))
                .await()
                .indefinitely();

        // then
        assertFalse(canSeeTransactionRecord, "User should (by default) not be able to see all transaction records");
    }

    @Test
    public void creatorCanSeeTheirOwnTransactionRecord() {
        // given
        authModel.write(List.of(
                        TupleKey.of("organisation:hopps", "member", "user:emilia").nullCondition(),
                        TupleKey.of("bommel:op_paf", "part_of", "organisation:hopps").nullCondition(),
                        TupleKey.of("transaction_record:one", "assigned_to", "bommel:op_paf").nullCondition(),
                        TupleKey.of("transaction_record:one", "created_by", "user:emilia").nullCondition()), List.of())
                .await()
                .indefinitely();

        // when
        boolean canSeeTransactionRecord = authModel
                .check(TupleKey.of("transaction_record:one", "can_see", "user:emilia"))
                .await()
                .indefinitely();

        // then
        assertTrue(canSeeTransactionRecord, "User should be able to see their transaction record");
    }

    @Test
    public void ownerShouldSeeAllTransactionRecords() {
        // given
        authModel.write(List.of(
                        TupleKey.of("organisation:hopps", "owner", "user:emilia").nullCondition(),
                        TupleKey.of("bommel:op_paf", "part_of", "organisation:hopps").nullCondition(),
                        TupleKey.of("transaction_record:one", "assigned_to", "bommel:op_paf").nullCondition()), List.of())
                .await()
                .indefinitely();

        // when
        boolean canSeeTransactionRecord = authModel
                .check(TupleKey.of("transaction_record:one", "can_see", "user:emilia"))
                .await()
                .indefinitely();

        // then
        assertTrue(canSeeTransactionRecord, "Owner should be able to see transaction record in their own organisation");
    }

    @Test
    public void onlyBommelwartCanModifyTransactionRecord() {
        // given
        authModel.write(List.of(
                        TupleKey.of("organisation:hopps", "member", "user:emilia").nullCondition(),
                        TupleKey.of("organisation:hopps", "member", "user:somebommelwart").nullCondition(),
                        TupleKey.of("bommel:op_paf", "part_of", "organisation:hopps").nullCondition(),
                        TupleKey.of("bommel:op_paf", "bommelwart", "user:somebommelwart").nullCondition(),
                        TupleKey.of("transaction_record:one", "assigned_to", "bommel:op_paf").nullCondition(),
                        TupleKey.of("transaction_record:one", "created_by", "user:emilia").nullCondition()), List.of())
                .await()
                .indefinitely();

        // when
        boolean creatorCanModifyTransaction = authModel
                .check(TupleKey.of("transaction_record:one", "can_modify", "user:emilia"))
                .await()
                .indefinitely();
        boolean bommelwartCanModifyTransaction = authModel
                .check(TupleKey.of("transaction_record:one", "can_modify", "user:somebommelwart"))
                .await()
                .indefinitely();

        // then
        assertFalse(creatorCanModifyTransaction,
                "Creator of transaction record should not be able to modify this transaction record");
        assertTrue(bommelwartCanModifyTransaction,
                "Bommelwart should be able to modify transaction record on their bommel");
    }
}
