package app.hopps.workflow;

import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.transaction.Transactional.TxType;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;
import app.hopps.audit.domain.AuditLogEntry;
import app.hopps.audit.repository.AuditLogRepository;
import app.hopps.workflow.repository.WorkflowInstanceRepository;

@QuarkusTest
class ProcessEngineTest
{
	@Inject
	ProcessEngine processEngine;

	@Inject
	AuditLogRepository auditLogRepository;

	@Inject
	WorkflowInstanceRepository chainRepository;

	@Inject
	CalculateTotalTask calculateTotalTask;

	@Inject
	SendNotificationTask sendNotificationTask;

	@Inject
	ApprovalTask approvalTask;

	@Inject
	EnterOrderDetailsTask enterOrderDetailsTask;

	@BeforeEach
	@Transactional(TxType.REQUIRES_NEW)
	void setup()
	{
		// Clear all chains from previous tests
		chainRepository.deleteAll();
	}

	@Test
	void givenSystemTasksOnly_whenStartProcess_thenCompletesImmediately()
	{
		// Given
		ProcessDefinition process = new ProcessDefinition("SimpleCalculation")
			.addTask(calculateTotalTask)
			.addTask(sendNotificationTask);

		Map<String, Object> initialVars = new HashMap<>();
		initialVars.put("price", 10.0);
		initialVars.put("quantity", 5);
		initialVars.put("recipient", "customer@example.com");

		// When
		WorkflowInstance instance = processEngine.startProcess(process, initialVars);

		// Then
		assertEquals(WorkflowStatus.COMPLETED, instance.getStatus());
		assertEquals(50.0, instance.getVariable("total"));
		assertTrue((Boolean)instance.getVariable("notificationSent"));

		// Verify audit logs
		List<AuditLogEntry> logs = auditLogRepository.findByWorkflowInstanceId(instance.getId());
		assertFalse(logs.isEmpty());
		assertTrue(logs.stream().anyMatch(l -> "ProcessStarted".equals(l.getTaskName())));
		assertTrue(logs.stream().anyMatch(l -> "CalculateTotal".equals(l.getTaskName())));
		assertTrue(logs.stream().anyMatch(l -> "SendNotification".equals(l.getTaskName())));
		assertTrue(logs.stream().anyMatch(l -> "ProcessCompleted".equals(l.getTaskName())));
	}

	@Test
	void givenUserTask_whenStartProcess_thenWaitsForUser()
	{
		// Given
		ProcessDefinition process = new ProcessDefinition("OrderWithApproval")
			.addTask(enterOrderDetailsTask)
			.addTask(calculateTotalTask);

		// When
		WorkflowInstance instance = processEngine.startProcess(process);

		// Then
		assertEquals(WorkflowStatus.WAITING, instance.getStatus());
		assertTrue(instance.isWaitingForUser());
		assertEquals("EnterOrderDetails", instance.getCurrentUserTask());
	}

	@Test
	void givenWaitingChain_whenCompleteUserTask_thenResumes()
	{
		// Given
		ProcessDefinition process = new ProcessDefinition("OrderWithApproval")
			.addTask(enterOrderDetailsTask)
			.addTask(calculateTotalTask)
			.addTask(sendNotificationTask);

		WorkflowInstance instance = processEngine.startProcess(process);
		assertEquals(WorkflowStatus.WAITING, instance.getStatus());

		// When - complete the user task
		Map<String, Object> userInput = new HashMap<>();
		userInput.put("price", 25.0);
		userInput.put("quantity", 4);
		userInput.put("recipient", "test@example.com");

		WorkflowInstance updatedInstance = processEngine.completeUserTask(instance.getId(), userInput, "testuser");

		// Then
		assertEquals(WorkflowStatus.COMPLETED, updatedInstance.getStatus());
		assertEquals(100.0, updatedInstance.getVariable("total"));
		assertTrue((Boolean)updatedInstance.getVariable("notificationSent"));
	}

	@Test
	void givenMultipleUserTasks_whenCompleteSequentially_thenProcessCompletes()
	{
		// Given
		ProcessDefinition process = new ProcessDefinition("ApprovalProcess")
			.addTask(enterOrderDetailsTask)
			.addTask(calculateTotalTask)
			.addTask(approvalTask)
			.addTask(sendNotificationTask);

		// When - start process (waits at first user task)
		WorkflowInstance instance = processEngine.startProcess(process);
		assertEquals(WorkflowStatus.WAITING, instance.getStatus());
		assertEquals("EnterOrderDetails", instance.getCurrentUserTask());

		// Complete first user task
		Map<String, Object> orderDetails = new HashMap<>();
		orderDetails.put("price", 100.0);
		orderDetails.put("quantity", 2);
		orderDetails.put("recipient", "customer@test.com");

		instance = processEngine.completeUserTask(instance.getId(), orderDetails, "clerk");

		// Now waiting at approval task
		assertEquals(WorkflowStatus.WAITING, instance.getStatus());
		assertEquals("ManagerApproval", instance.getCurrentUserTask());
		assertEquals(200.0, instance.getVariable("total")); // CalculateTotal
															// ran

		// Complete approval task
		Map<String, Object> approval = new HashMap<>();
		approval.put("approved", true);
		approval.put("comment", "Looks good!");

		instance = processEngine.completeUserTask(instance.getId(), approval, "manager");

		// Then - process complete
		assertEquals(WorkflowStatus.COMPLETED, instance.getStatus());
		assertTrue((Boolean)instance.getVariable("approved"));
		assertEquals("Looks good!", instance.getVariable("approvalComment"));
		assertTrue((Boolean)instance.getVariable("notificationSent"));
	}

	@Test
	void givenRejectedApproval_whenComplete_thenProcessFails()
	{
		// Given
		ProcessDefinition process = new ProcessDefinition("RejectionProcess")
			.addTask(enterOrderDetailsTask)
			.addTask(approvalTask)
			.addTask(sendNotificationTask);

		WorkflowInstance instance = processEngine.startProcess(process);

		// Complete order details
		Map<String, Object> orderDetails = new HashMap<>();
		orderDetails.put("price", 50.0);
		orderDetails.put("quantity", 1);
		instance = processEngine.completeUserTask(instance.getId(), orderDetails, "clerk");

		// When - reject the approval
		Map<String, Object> rejection = new HashMap<>();
		rejection.put("approved", false);
		rejection.put("comment", "Too expensive");

		instance = processEngine.completeUserTask(instance.getId(), rejection, "manager");

		// Then - process failed
		assertEquals(WorkflowStatus.FAILED, instance.getStatus());
		assertFalse((Boolean)instance.getVariable("approved"));
		assertEquals("Request was rejected", instance.getError());
		// Notification task was not executed
		assertNull(instance.getVariable("notificationSent"));
	}

	@Test
	void givenInvalidUserInput_whenComplete_thenValidationFails()
	{
		// Given
		ProcessDefinition process = new ProcessDefinition("ValidationTest")
			.addTask(enterOrderDetailsTask)
			.addTask(calculateTotalTask);

		WorkflowInstance instance = processEngine.startProcess(process);

		// When - provide invalid input (negative quantity)
		Map<String, Object> invalidInput = new HashMap<>();
		invalidInput.put("price", 10.0);
		invalidInput.put("quantity", -5);

		WorkflowInstance result = processEngine.completeUserTask(instance.getId(), invalidInput, "user");

		// Then - still waiting, validation failed
		assertEquals(WorkflowStatus.FAILED, result.getStatus());
		assertNotNull(result.getError());
	}

	@Test
	void givenChainId_whenGetChain_thenReturnsChain()
	{
		// Given
		ProcessDefinition process = new ProcessDefinition("GetChainTest")
			.addTask(enterOrderDetailsTask);

		WorkflowInstance instance = processEngine.startProcess(process);

		// When
		WorkflowInstance retrieved = processEngine.getChain(instance.getId());

		// Then
		assertNotNull(retrieved);
		assertEquals(instance.getId(), retrieved.getId());
	}

	// ===== Persistence Tests =====

	@Test
	void givenStartedProcess_whenCheckDatabase_thenChainIsPersisted()
	{
		// Given
		ProcessDefinition process = new ProcessDefinition("PersistenceTest")
			.addTask(calculateTotalTask)
			.addTask(sendNotificationTask);

		Map<String, Object> vars = new HashMap<>();
		vars.put("price", 20.0);
		vars.put("quantity", 3);
		vars.put("recipient", "test@example.com");

		// When
		WorkflowInstance instance = processEngine.startProcess(process, vars);

		// Then - verify chain exists in database
		WorkflowInstance persisted = chainRepository.findById(instance.getId());
		assertNotNull(persisted, "WorkflowInstance should be persisted to database");
		assertEquals(instance.getId(), persisted.getId());
		assertEquals("PersistenceTest", persisted.getProcessName());
		assertEquals(WorkflowStatus.COMPLETED, persisted.getStatus());
		assertNotNull(persisted.getCreatedAt());
		assertNotNull(persisted.getUpdatedAt());
	}

	@Test
	void givenPersistedChain_whenLoadFromDatabase_thenCanResume()
	{
		// Given - start a process that waits at user task
		ProcessDefinition process = new ProcessDefinition("ResumeTest")
			.addTask(enterOrderDetailsTask)
			.addTask(calculateTotalTask)
			.addTask(sendNotificationTask);

		WorkflowInstance originalInstance = processEngine.startProcess(process);
		String workflowInstanceId = originalInstance.getId();

		// When - load chain from database (simulating restart)
		WorkflowInstance loadedInstance = chainRepository.findById(workflowInstanceId);

		// Then - verify chain state is correct
		assertNotNull(loadedInstance);
		assertEquals(WorkflowStatus.WAITING, loadedInstance.getStatus());
		assertTrue(loadedInstance.isWaitingForUser());
		assertEquals("EnterOrderDetails", loadedInstance.getCurrentUserTask());

		// And - can complete user task to resume
		Map<String, Object> userInput = new HashMap<>();
		userInput.put("price", 15.0);
		userInput.put("quantity", 2);
		userInput.put("recipient", "resume@test.com");

		WorkflowInstance completed = processEngine.completeUserTask(workflowInstanceId, userInput, "testuser");
		assertEquals(WorkflowStatus.COMPLETED, completed.getStatus());
	}

	@Test
	void givenVariousVariableTypes_whenPersist_thenSerializedCorrectly()
	{
		// Given - variables with primitives, strings, lists, maps
		ProcessDefinition process = new ProcessDefinition("VariableSerializationTest")
			.addTask(calculateTotalTask);

		Map<String, Object> vars = new HashMap<>();
		vars.put("stringVar", "test value");
		vars.put("intVar", 42);
		vars.put("doubleVar", 3.14);
		vars.put("boolVar", true);
		vars.put("listVar", List.of("item1", "item2", "item3"));
		vars.put("mapVar", Map.of("key1", "value1", "key2", 123));
		vars.put("price", 10.0);
		vars.put("quantity", 5);

		// When
		WorkflowInstance instance = processEngine.startProcess(process, vars);

		// Then - reload from database and verify all variables
		WorkflowInstance loaded = chainRepository.findById(instance.getId());
		assertNotNull(loaded);

		assertEquals("test value", loaded.getVariable("stringVar"));
		assertEquals(42, loaded.getVariable("intVar"));
		assertEquals(3.14, loaded.getVariable("doubleVar"));
		assertEquals(true, loaded.getVariable("boolVar"));

		// List and Map are deserialized as ArrayList and HashMap by JSON
		@SuppressWarnings("unchecked")
		List<String> list = (List<String>)loaded.getVariable("listVar");
		assertEquals(3, list.size());
		assertTrue(list.contains("item1"));

		@SuppressWarnings("unchecked")
		Map<String, Object> map = (Map<String, Object>)loaded.getVariable("mapVar");
		assertEquals("value1", map.get("key1"));
		assertEquals(123, map.get("key2"));

		// Verify calculated total was also persisted
		assertEquals(50.0, loaded.getVariable("total"));
	}

	@Test
	void givenWorkflowInstanceRepository_whenQueryByStatus_thenFindsCorrectChains()
	{
		// Given - create chains with different statuses
		ProcessDefinition completedProcess = new ProcessDefinition("CompletedProcess")
			.addTask(calculateTotalTask);

		ProcessDefinition waitingProcess = new ProcessDefinition("WaitingProcess")
			.addTask(enterOrderDetailsTask);

		Map<String, Object> vars = new HashMap<>();
		vars.put("price", 10.0);
		vars.put("quantity", 2);

		WorkflowInstance completed1 = processEngine.startProcess(completedProcess, vars);
		WorkflowInstance completed2 = processEngine.startProcess(completedProcess, vars);
		WorkflowInstance waiting1 = processEngine.startProcess(waitingProcess);
		WorkflowInstance waiting2 = processEngine.startProcess(waitingProcess);

		// When
		List<WorkflowInstance> completedChains = chainRepository.findByStatus(WorkflowStatus.COMPLETED);
		List<WorkflowInstance> waitingChains = chainRepository.findWaitingChains();
		List<WorkflowInstance> activeChains = chainRepository.findActiveChains();

		// Then
		assertEquals(2, completedChains.size());
		assertEquals(2, waitingChains.size());
		assertEquals(2, activeChains.size()); // Only waiting chains are active

		assertTrue(completedChains.stream().anyMatch(c -> c.getId().equals(completed1.getId())));
		assertTrue(completedChains.stream().anyMatch(c -> c.getId().equals(completed2.getId())));
		assertTrue(waitingChains.stream().anyMatch(c -> c.getId().equals(waiting1.getId())));
		assertTrue(waitingChains.stream().anyMatch(c -> c.getId().equals(waiting2.getId())));
	}
}
